import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { initDb, all, get, run, db, formatQuoteNumber, ROLES } from './db.js';
import { requireAuth, requireRole, signUser } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
initDb();

const app = express();
const port = process.env.PORT || 4000;
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 8 * 1024 * 1024, files: 50 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image uploads are allowed.'));
  }
});

const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const isLocalDev = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    if (isLocalDev || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  }
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function writeUInt16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function writeUInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

function safeZipName(name) {
  return String(name || 'photo').replace(/[\\/:*?"<>|]/g, '-');
}

function createZip(files) {
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;
  const { time, day } = dosDateTime();

  files.forEach((file, index) => {
    const data = fs.readFileSync(file.path);
    const name = Buffer.from(file.zipName || `${String(index + 1).padStart(2, '0')}-${safeZipName(file.name)}`);
    const checksum = crc32(data);
    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(time),
      writeUInt16(day),
      writeUInt32(checksum),
      writeUInt32(data.length),
      writeUInt32(data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name
    ]);

    chunks.push(localHeader, data);
    centralDirectory.push(Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(time),
      writeUInt16(day),
      writeUInt32(checksum),
      writeUInt32(data.length),
      writeUInt32(data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(offset),
      name
    ]));
    offset += localHeader.length + data.length;
  });

  const centralStart = offset;
  const centralBuffer = Buffer.concat(centralDirectory);
  const end = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(files.length),
    writeUInt16(files.length),
    writeUInt32(centralBuffer.length),
    writeUInt32(centralStart),
    writeUInt16(0)
  ]);

  return Buffer.concat([...chunks, centralBuffer, end]);
}
function canAccessQuote(user, quote) {
  if (user.role === ROLES.MANAGEMENT) return true;
  if (user.role === ROLES.ASSESSOR) return quote.assessor_id === user.id;
  if (user.role === ROLES.QUOTE_ADMINISTRATOR) return quote.quote_administrator_id === user.id;
  return false;
}
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

app.get('/api/users/assessors', requireAuth, requireRole(ROLES.SCHEDULE_ADMINISTRATOR, ROLES.QUOTE_ADMINISTRATOR, ROLES.MANAGEMENT), (req, res) => {
  const params = [ROLES.ASSESSOR];
  const assignedFilter = req.user.role === ROLES.QUOTE_ADMINISTRATOR ? 'AND u.quote_administrator_id = ?' : '';
  if (req.user.role === ROLES.QUOTE_ADMINISTRATOR) params.push(req.user.id);

  res.json(all(`
    SELECT u.id, u.name, u.email, u.quote_administrator_id, qa.name AS quote_administrator_name
    FROM users u
    LEFT JOIN users qa ON qa.id = u.quote_administrator_id
    WHERE u.role = ? ${assignedFilter}
    ORDER BY u.name
  `, params));
});

app.get('/api/users/quote-administrators', requireAuth, requireRole(ROLES.SCHEDULE_ADMINISTRATOR, ROLES.MANAGEMENT), (_req, res) => {
  res.json(all('SELECT id, name, email FROM users WHERE role = ? ORDER BY name', [ROLES.QUOTE_ADMINISTRATOR]));
});
app.get('/api/clients', requireAuth, requireRole(ROLES.SCHEDULE_ADMINISTRATOR, ROLES.MANAGEMENT), (req, res) => {
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
    SELECT id, section, category, quote_group, item_code, description, unit, ${[ROLES.QUOTE_ADMINISTRATOR, ROLES.MANAGEMENT].includes(req.user.role) ? 'rate' : 'NULL AS rate'}
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
  if (req.user.role === ROLES.QUOTE_ADMINISTRATOR || req.user.role === ROLES.MANAGEMENT) {
    const params = [];
    const quoteAdminFilter = req.user.role === ROLES.QUOTE_ADMINISTRATOR
      ? 'AND assessor.quote_administrator_id = ?'
      : '';
    if (req.user.role === ROLES.QUOTE_ADMINISTRATOR) params.push(req.user.id);

    const rows = all(`
      SELECT
        q.id AS quote_id,
        q.quote_number,
        q.customer_name,
        q.site_address,
        q.request_details,
        q.created_at AS appointment_start,
        q.created_at AS appointment_end,
        q.status,
        q.subtotal,
        assessor.id AS assessor_id,
        assessor.name AS assessor_name,
        qa.id AS quote_administrator_id,
        qa.name AS quote_administrator_name,
        c.name AS client_name,
        'quote_task' AS calendar_type
      FROM quotes q
      JOIN users assessor ON assessor.id = q.assessor_id
      LEFT JOIN users qa ON qa.id = assessor.quote_administrator_id
      LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.status = 'submitted' ${quoteAdminFilter}
      ORDER BY q.created_at
    `, params);
    return res.json(rows);
  }

  const params = [];
  let where = "WHERE a.status = 'scheduled'";
  if (req.user.role === ROLES.ASSESSOR) {
    where += ' AND a.assessor_id = ?';
    params.push(req.user.id);
  } else if (req.query.assessorId) {
    where += ' AND a.assessor_id = ?';
    params.push(Number(req.query.assessorId));
  }

  const rows = all(`
    SELECT a.*, u.name AS assessor_name, c.name AS client_name, q.id AS quote_id, q.quote_number, 'appointment' AS calendar_type
    FROM appointments a
    JOIN users u ON u.id = a.assessor_id
    LEFT JOIN clients c ON c.id = a.client_id
    LEFT JOIN quotes q ON q.appointment_id = a.id
    ${where}
    ORDER BY a.appointment_start
  `, params);
  res.json(rows);
});

app.post('/api/appointments', requireAuth, requireRole(ROLES.SCHEDULE_ADMINISTRATOR), (req, res) => {
  const { assessorId, clientId, siteAddress, requestDetails, appointmentStart, appointmentEnd } = req.body;
  const assessor = assessorId ? get('SELECT id FROM users WHERE id = ? AND role = ?', [assessorId, ROLES.ASSESSOR]) : null;
  const client = clientId ? get('SELECT id, name FROM clients WHERE id = ? AND active = 1', [clientId]) : null;
  if (!assessor || !client || !siteAddress || !requestDetails || !appointmentStart) {
    return res.status(400).json({ error: 'Assessor, client, address, details, and start time are required.' });
  }
  const result = run(`
    INSERT INTO appointments (assessor_id, client_id, customer_name, site_address, request_details, appointment_start, appointment_end)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [assessor.id, client.id, client.name, siteAddress, requestDetails, appointmentStart, appointmentEnd || null]);
  res.status(201).json(get('SELECT * FROM appointments WHERE id = ?', [result.lastInsertRowid]));
});
app.get('/api/quotes', requireAuth, (req, res) => {
  const requestedAssessorId = req.query.assessorId && req.query.assessorId !== 'all'
    ? Number(req.query.assessorId)
    : null;

  if (req.user.role === ROLES.SCHEDULE_ADMINISTRATOR) {
    return res.status(403).json({ error: 'Schedule administrators manage appointments only.' });
  }

  const params = [];
  const filters = [];

  if (req.user.role === ROLES.ASSESSOR) {
    filters.push('q.assessor_id = ?');
    params.push(req.user.id);
    filters.push("q.status = 'submitted'");
  } else if (req.user.role === ROLES.QUOTE_ADMINISTRATOR) {
    filters.push('assessor.quote_administrator_id = ?');
    params.push(req.user.id);
    filters.push("q.status = 'submitted'");
  } else if (req.user.role === ROLES.MANAGEMENT) {
    filters.push("q.status = 'submitted'");
  }

  if ([ROLES.QUOTE_ADMINISTRATOR, ROLES.MANAGEMENT].includes(req.user.role) && requestedAssessorId) {
    filters.push('q.assessor_id = ?');
    params.push(requestedAssessorId);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = all(`
    SELECT q.*, assessor.name AS assessor_name, qa.name AS quote_administrator_name, COUNT(p.id) AS photo_count
    FROM quotes q
    JOIN users assessor ON assessor.id = q.assessor_id
    LEFT JOIN users qa ON qa.id = assessor.quote_administrator_id
    LEFT JOIN quote_photos p ON p.quote_id = q.id
    ${where}
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `, params);
  res.json(rows);
});

app.get('/api/quotes/:id/photos.zip', requireAuth, requireRole(ROLES.QUOTE_ADMINISTRATOR), (req, res) => {
  const quote = get(`
    SELECT q.id, q.quote_number, q.customer_name, assessor.quote_administrator_id
    FROM quotes q
    JOIN users assessor ON assessor.id = q.assessor_id
    WHERE q.id = ? AND q.status = 'submitted'
  `, [req.params.id]);
  if (!quote) return res.status(404).json({ error: 'Quote not found.' });
  if (!canAccessQuote(req.user, quote)) return res.status(403).json({ error: 'Access denied.' });

  const photos = all('SELECT * FROM quote_photos WHERE quote_id = ? ORDER BY id', [quote.id]);
  if (photos.length === 0) return res.status(404).json({ error: 'This quote has no photos to download.' });

  const quoteZipName = safeZipName(quote.quote_number || `Quote-${quote.id}`);
  const files = photos
    .map((photo, index) => ({
      name: photo.original_name,
      zipName: `${String(index + 1).padStart(2, '0')}-${safeZipName(photo.original_name)}`,
      path: path.join(uploadsDir, photo.file_name)
    }))
    .filter((photo) => fs.existsSync(photo.path));

  if (files.length === 0) return res.status(404).json({ error: 'The photo files could not be found on disk.' });

  const zip = createZip(files);
  const fileName = `${quoteZipName}-photos.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', zip.length);
  res.send(zip);
});
app.get('/api/quotes/:id', requireAuth, (req, res) => {
  const quote = get(`
    SELECT q.*, assessor.name AS assessor_name, assessor.quote_administrator_id, qa.name AS quote_administrator_name
    FROM quotes q
    JOIN users assessor ON assessor.id = q.assessor_id
    LEFT JOIN users qa ON qa.id = assessor.quote_administrator_id
    WHERE q.id = ?
  `, [req.params.id]);
  if (!quote) return res.status(404).json({ error: 'Quote not found.' });
  if (!canAccessQuote(req.user, quote)) return res.status(403).json({ error: 'Access denied.' });
  quote.items = all('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id', [quote.id]);
  quote.photos = all('SELECT * FROM quote_photos WHERE quote_id = ? ORDER BY id', [quote.id]).map((photo) => ({
    ...photo,
    url: `/uploads/${photo.file_name}`
  }));
  res.json(quote);
});

app.patch('/api/quotes/:id/complete', requireAuth, requireRole(ROLES.QUOTE_ADMINISTRATOR), (req, res) => {
  const erpQuoteNumber = String(req.body.erpQuoteNumber || '').trim();
  if (!erpQuoteNumber) return res.status(400).json({ error: 'ERP quote number is required before completing the quote.' });

  const quote = get(`
    SELECT q.id, q.status, assessor.quote_administrator_id
    FROM quotes q
    JOIN users assessor ON assessor.id = q.assessor_id
    WHERE q.id = ?
  `, [req.params.id]);
  if (!quote) return res.status(404).json({ error: 'Quote not found.' });
  if (!canAccessQuote(req.user, quote)) return res.status(403).json({ error: 'Access denied.' });
  if (quote.status !== 'submitted') return res.status(400).json({ error: 'Only outstanding submitted quotes can be completed.' });

  run(`
    UPDATE quotes
    SET status = 'completed', erp_quote_number = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [erpQuoteNumber, quote.id]);
  res.json({ id: quote.id, message: 'Quote marked as complete.' });
});

app.post('/api/quotes', requireAuth, requireRole(ROLES.ASSESSOR), upload.array('photos', 50), (req, res) => {
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
    if (payload.appointmentId) run('UPDATE appointments SET status = ? WHERE id = ? AND assessor_id = ?', ['completed', payload.appointmentId, req.user.id]);
    db.exec('COMMIT');
    res.status(201).json({ id: quoteId, quoteNumber, message: 'Quote submitted to quote administrator.' });
  } catch (error) {
    db.exec('ROLLBACK');
    (req.files || []).forEach((file) => fs.rmSync(file.path, { force: true }));
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/quotes/:id', requireAuth, requireRole(ROLES.ASSESSOR), upload.array('photos', 50), (req, res) => {
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

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_COUNT: 'You can upload a maximum of 50 photos per quote.',
      LIMIT_FILE_SIZE: 'Each photo must be 8MB or smaller.',
      LIMIT_UNEXPECTED_FILE: 'Only quote photos can be uploaded here.'
    };
    return res.status(400).json({ error: messages[error.code] || error.message });
  }
  if (error?.message === 'Only image uploads are allowed.') {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

















