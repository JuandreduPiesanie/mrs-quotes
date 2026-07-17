import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultClients } from './clients.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'mrs-quotes.sqlite'));
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export const ROLES = {
  MANAGEMENT: 'management',
  SCHEDULE_ADMINISTRATOR: 'schedule_administrator',
  QUOTE_ADMINISTRATOR: 'quote_administrator',
  ASSESSOR: 'assessor'
};

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('management', 'schedule_administrator', 'quote_administrator', 'assessor')),
      quote_administrator_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      quote_group TEXT NOT NULL DEFAULT 'General',
      item_code TEXT,
      description TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'Each',
      rate REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      source_sheet TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessor_id INTEGER NOT NULL REFERENCES users(id),
      customer_name TEXT NOT NULL,
      site_address TEXT NOT NULL,
      request_details TEXT NOT NULL,
      appointment_start TEXT NOT NULL,
      appointment_end TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessor_id INTEGER NOT NULL REFERENCES users(id),
      appointment_id INTEGER REFERENCES appointments(id),
      quote_number TEXT UNIQUE,
      customer_name TEXT NOT NULL,
      site_address TEXT NOT NULL,
      request_details TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      subtotal REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      price_item_id INTEGER NOT NULL REFERENCES price_items(id),
      description TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_rate REAL NOT NULL,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quote_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  migrateUsersRoleSchema();
  ensureColumn('users', 'quote_administrator_id', 'INTEGER REFERENCES users(id)');
  ensureColumn('price_items', 'category', "TEXT NOT NULL DEFAULT 'General'");
  ensureColumn('price_items', 'quote_group', "TEXT NOT NULL DEFAULT 'General'");
  ensureColumn('appointments', 'client_id', 'INTEGER REFERENCES clients(id)');
  ensureColumn('quotes', 'client_id', 'INTEGER REFERENCES clients(id)');
  ensureColumn('quotes', 'quote_number', 'TEXT');
  ensureColumn('quotes', 'erp_quote_number', 'TEXT');
  ensureColumn('quotes', 'completed_at', 'TEXT');
  backfillQuoteNumbers();
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number) WHERE quote_number IS NOT NULL;');

  seedClients();
  seedUsers();
  seedPrices();
}

function migrateUsersRoleSchema() {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (!table?.sql || table.sql.includes('quote_administrator')) return;

  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('ALTER TABLE users RENAME TO users_old;');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('management', 'schedule_administrator', 'quote_administrator', 'assessor')),
      quote_administrator_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    SELECT id, name, email, password_hash,
      CASE WHEN role = 'administrator' THEN 'quote_administrator' ELSE role END,
      created_at
    FROM users_old;
  `);
  db.exec('DROP TABLE users_old;');
  db.exec('PRAGMA foreign_keys = ON;');
}

function seedUsers() {
  const insert = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  insert.run('Management User', 'management@mrs.local', bcrypt.hashSync('management123', 10), ROLES.MANAGEMENT);
  insert.run('Schedule Administrator', 'schedule@mrs.local', bcrypt.hashSync('schedule123', 10), ROLES.SCHEDULE_ADMINISTRATOR);
  insert.run('Quote Administrator', 'quoteadmin@mrs.local', bcrypt.hashSync('quoteadmin123', 10), ROLES.QUOTE_ADMINISTRATOR);
  insert.run('Quote Assessor', 'assessor@mrs.local', bcrypt.hashSync('assessor123', 10), ROLES.ASSESSOR);

  const legacyAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@mrs.local');
  if (legacyAdmin) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(ROLES.QUOTE_ADMINISTRATOR, legacyAdmin.id);

  const quoteAdmin = db.prepare('SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1').get(ROLES.QUOTE_ADMINISTRATOR);
  if (quoteAdmin) {
    db.prepare('UPDATE users SET quote_administrator_id = ? WHERE role = ? AND quote_administrator_id IS NULL').run(quoteAdmin.id, ROLES.ASSESSOR);
  }
}

function seedPrices() {
  const priceCount = db.prepare('SELECT COUNT(*) AS count FROM price_items').get().count;
  if (priceCount !== 0) return;

  const insert = db.prepare(`
    INSERT INTO price_items (section, category, quote_group, item_code, description, unit, rate, source_sheet)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['Starter', 'Emergency Work', 'Emergency', 'MRS-001', 'Initial site inspection and quick make-safe allowance', 'Each', 850, 'Starter'],
    ['Starter', 'Building Work', 'Building', 'MRS-002', 'Replace damaged ceiling board', 'm2', 420, 'Starter'],
    ['Starter', 'Painting', 'Building', 'MRS-003', 'Prepare and paint interior wall', 'm2', 95, 'Starter'],
    ['Starter', 'Waterproofing', 'Roofing', 'MRS-004', 'Torch-on waterproofing repair', 'm2', 310, 'Starter'],
    ['Starter', 'Cleaning', 'Building', 'MRS-005', 'Post-repair cleaning crew', 'Hour', 280, 'Starter']
  ].forEach((row) => insert.run(...row));
}

function seedClients() {
  const insert = db.prepare('INSERT OR IGNORE INTO clients (name) VALUES (?)');
  defaultClients.forEach((name) => insert.run(name));
}

function backfillQuoteNumbers() {
  const rows = db.prepare("SELECT id FROM quotes WHERE quote_number IS NULL OR quote_number = '' ORDER BY id").all();
  const update = db.prepare('UPDATE quotes SET quote_number = ? WHERE id = ?');
  rows.forEach((quote) => update.run(formatQuoteNumber(quote.id), quote.id));
}

export function formatQuoteNumber(id) {
  return `MRS-Q-${String(id).padStart(6, '0')}`;
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

export function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

export function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

