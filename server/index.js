import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { initDb, all, get, run, db, formatQuoteNumber } from './db.js';
import { requireAuth, requireRole, signUser } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
initDb();

const app = express();
const port = process.env.PORT || 4000;
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image uploads are allowed.'));
  }
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = get('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()]);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  res.json({
    token: signUser(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.get('/api/users/assessors', requireAuth, requireRole('administrator'), (_req, res) => {
  res.json(all('SELECT id, name, email FROM users WHERE role = ? ORDER BY name', ['assessor']));
});
app.get('/api/clients', requireAuth, requireRole('administrator'), (req, res) => {
  const search = String(req.query.search || '').trim();
  const params = search ? [`%${search}%`] : [];
  const where = search ? 'WHERE active = 1 AND name LIKE ?' : 'WHERE active = 1';
  res.json(all(`SELECT id, name FROM clients ${where} ORDER BY name LIMIT 50`, params));
});

app.get('/api/price-items', requireAuth, (req, res) => {
  const group = req.query.group ? String(req.query.group) : null;
  const params = group ? [group] : [];
  const where = group ? 'WHERE active = 1 AND quote_group = ?' : 'WHERE active = 1';
  const items = all(`
    SELECT id, section, category, quote_group, item_code, description, unit, ${req.user.role === 'administrator' ? 'rate' : 'NULL AS rate'}
    FROM price_items
    ${where}
    ORDER BY category, description
  `, params);
  res.json(items);
});

app.get('/api/price-sections', requireAuth, (_req, res) => {
  res.json(all(`
    SELECT quote_group AS section, quote_group, COUNT(*) AS item_count
    FROM price_items
    WHERE active = 1
    GROUP BY quote_group
    ORDER BY quote_group
  `));
});

app.get('/api/appointments', requireAuth, (req, res) => {
  const assessorId = req.user.role === 'administrator' && req.query.assessorId ? Number(req.query.assessorId) : req.user.id;
  const rows = all(`
    SELECT a.*, u.name AS assessor_name, c.name AS client_name
    FROM appointments a
    JOIN users u ON u.id = a.assessor_id
    LEFT JOIN clients c ON c.id = a.client_id
    WHERE a.assessor_id = ?
    ORDER BY a.appointment_start
  `, [assessorId]);
  res.json(rows);
});

app.post('/api/appointments', requireAuth, requireRole('administrator'), (req, res) => {
  const { assessorId, clientId, siteAddress, requestDetails, appointmentStart, appointmentEnd } = req.body;
  const client = clientId ? get('SELECT id, name FROM clients WHERE id = ? AND active = 1', [clientId]) : null;
  if (!assessorId || !client || !siteAddress || !requestDetails || !appointmentStart) {
    return res.status(400).json({ error: 'Assessor, client, address, details, and start time are required.' });
  }
  const result = run(`
    INSERT INTO appointments (assessor_id, client_id, customer_name, site_address, request_details, appointment_start, appointment_end)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [assessorId, client.id, client.name, siteAddress, requestDetails, appointmentStart, appointmentEnd || null]);
  res.status(201).json(get('SELECT * FROM appointments WHERE id = ?', [result.lastInsertRowid]));
});
app.get('/api/quotes', requireAuth, (req, res) => {
  const requestedAssessorId = req.user.role === 'administrator' && req.query.assessorId
    ? Number(req.query.assessorId)
    : null;

  if (req.user.role === 'administrator') {
    const params = requestedAssessorId ? [requestedAssessorId] : [];
    const where = requestedAssessorId ? 'WHERE q.assessor_id = ?' : '';
    const rows = all(`
      SELECT q.*, u.name AS assessor_name, COUNT(p.id) AS photo_count
      FROM quotes q
      JOIN users u ON u.id = q.assessor_id
      LEFT JOIN quote_photos p ON p.quote_id = q.id
      ${where}
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `, params);
    return res.json(rows);
  }

  const rows = all(`
    SELECT q.*, u.name AS assessor_name, COUNT(p.id) AS photo_count
    FROM quotes q
    JOIN users u ON u.id = q.assessor_id
    LEFT JOIN quote_photos p ON p.quote_id = q.id
    WHERE q.assessor_id = ?
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `, [req.user.id]);
  res.json(rows);
});

app.get('/api/quotes/:id', requireAuth, (req, res) => {
  const quote = get(`
    SELECT q.*, u.name AS assessor_name
    FROM quotes q
    JOIN users u ON u.id = q.assessor_id
    WHERE q.id = ?
  `, [req.params.id]);
  if (!quote) return res.status(404).json({ error: 'Quote not found.' });
  if (req.user.role !== 'administrator' && quote.assessor_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  quote.items = all('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id', [quote.id]);
  quote.photos = all('SELECT * FROM quote_photos WHERE quote_id = ? ORDER BY id', [quote.id]).map((photo) => ({
    ...photo,
    url: `/uploads/${photo.file_name}`
  }));
  res.json(quote);
});

app.post('/api/quotes', requireAuth, requireRole('assessor'), upload.array('photos', 12), (req, res) => {
  const payload = JSON.parse(req.body.payload || '{}');
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!payload.appointmentId || items.length === 0) {
    return res.status(400).json({ error: 'A booked appointment and at least one line item are required.' });
  }

  const appointment = get('SELECT * FROM appointments WHERE id = ? AND assessor_id = ?', [payload.appointmentId, req.user.id]);
  if (!appointment) {
    return res.status(400).json({ error: 'Selected appointment was not found for this assessor.' });
  }
  const quoteDetails = appointment;

  const created = db.prepare(`
    INSERT INTO quotes (assessor_id, appointment_id, client_id, customer_name, site_address, request_details, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const createdItem = db.prepare(`
    INSERT INTO quote_items (quote_id, price_item_id, description, unit, quantity, unit_rate, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const createdPhoto = db.prepare(`
    INSERT INTO quote_photos (quote_id, original_name, file_name, mime_type)
    VALUES (?, ?, ?, ?)
  `);

  try {
    db.exec('BEGIN');
    const pricedItems = items.map((item) => {
      const price = get('SELECT id, description, unit, rate FROM price_items WHERE id = ? AND active = 1', [item.priceItemId]);
      if (!price) throw new Error('A selected price item is no longer available.');
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantities must be greater than zero.');
      return { ...price, quantity, lineTotal: Number((quantity * price.rate).toFixed(2)) };
    });
    const subtotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const result = created.run(
      req.user.id,
      appointment?.id || null,
      quoteDetails.client_id || null,
      quoteDetails.customer_name,
      quoteDetails.site_address,
      quoteDetails.request_details || '',
      Number(subtotal.toFixed(2))
    );
    const quoteId = result.lastInsertRowid;
    const quoteNumber = formatQuoteNumber(quoteId);
    run('UPDATE quotes SET quote_number = ? WHERE id = ?', [quoteNumber, quoteId]);
    pricedItems.forEach((item) => createdItem.run(quoteId, item.id, item.description, item.unit, item.quantity, item.rate, item.lineTotal));
    (req.files || []).forEach((file) => createdPhoto.run(quoteId, file.originalname, file.filename, file.mimetype));
    if (payload.appointmentId) run('UPDATE appointments SET status = ? WHERE id = ? AND assessor_id = ?', ['quoted', payload.appointmentId, req.user.id]);
    db.exec('COMMIT');
    res.status(201).json({ id: quoteId, quoteNumber, message: 'Quote submitted to administrator.' });
  } catch (error) {
    db.exec('ROLLBACK');
    (req.files || []).forEach((file) => fs.rmSync(file.path, { force: true }));
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/quotes/:id', requireAuth, requireRole('assessor'), upload.array('photos', 12), (req, res) => {
  const quote = get('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
  if (!quote) return res.status(404).json({ error: 'Quote not found.' });
  if (quote.assessor_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own quotes.' });

  const payload = JSON.parse(req.body.payload || '{}');
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required.' });
  }

  const updateQuote = db.prepare(`
    UPDATE quotes
    SET subtotal = ?
    WHERE id = ? AND assessor_id = ?
  `);
  const createdItem = db.prepare(`
    INSERT INTO quote_items (quote_id, price_item_id, description, unit, quantity, unit_rate, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const createdPhoto = db.prepare(`
    INSERT INTO quote_photos (quote_id, original_name, file_name, mime_type)
    VALUES (?, ?, ?, ?)
  `);

  try {
    db.exec('BEGIN');
    const pricedItems = items.map((item) => {
      const price = get('SELECT id, description, unit, rate FROM price_items WHERE id = ? AND active = 1', [item.priceItemId]);
      if (!price) throw new Error('A selected price item is no longer available.');
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantities must be greater than zero.');
      return { ...price, quantity, lineTotal: Number((quantity * price.rate).toFixed(2)) };
    });
    const subtotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    updateQuote.run(Number(subtotal.toFixed(2)), req.params.id, req.user.id);
    run('DELETE FROM quote_items WHERE quote_id = ?', [req.params.id]);
    pricedItems.forEach((item) => createdItem.run(req.params.id, item.id, item.description, item.unit, item.quantity, item.rate, item.lineTotal));
    (req.files || []).forEach((file) => createdPhoto.run(req.params.id, file.originalname, file.filename, file.mimetype));
    db.exec('COMMIT');
    res.json({ id: Number(req.params.id), message: 'Quote updated.' });
  } catch (error) {
    db.exec('ROLLBACK');
    (req.files || []).forEach((file) => fs.rmSync(file.path, { force: true }));
    res.status(400).json({ error: error.message });
  }
});
app.listen(port, () => {
  console.log(`MRS Quotes API running on http://localhost:${port}`);
});
