import path from 'node:path';
import xlsx from 'xlsx';
import { initDb, db } from '../db.js';

const defaultPath = 'C:\\Users\\Juandre Gaming\\OneDrive\\Desktop\\Outsurance Rates.xlsx';
const workbookPath = process.argv[2] || defaultPath;

const normalise = (value) => String(value ?? '').trim();
const normaliseUnit = (value) => {
  const unit = normalise(value);
  if (!unit || unit === '1') return 'Each';
  if (unit.toLowerCase() === 'each') return 'Each';
  return unit;
};
const numberFrom = (value) => {
  if (typeof value === 'number') return value;
  const cleaned = normalise(value).replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

function pick(row, names) {
  const entries = Object.entries(row);
  for (const name of names) {
    const found = entries.find(([key]) => key.toLowerCase().includes(name));
    if (found && normalise(found[1])) return found[1];
  }
  return '';
}

function quoteGroupFor(section, category, description) {
  const sectionText = normalise(section).toUpperCase();
  const categoryText = normalise(category).toUpperCase();
  const text = `${section} ${category} ${description}`.toLowerCase();

  if (sectionText === 'SECTION A') return 'Inspection';
  if (sectionText === 'SECTION C') return 'Leak Detection';
  if (sectionText === 'SECTION F') return 'BIC';
  if (sectionText === 'SECTION G') return 'Steelwork';
  if (sectionText === 'SECTION I') return 'Aircon';
  if (sectionText === 'SECTION J') return 'Borehole';
  if (sectionText === 'SECTION K') return 'Pool';

  if (sectionText === 'SECTION B') {
    if (text.includes('geyser') || text.includes('element') || text.includes('thermostat')) return 'Geyser';
    return 'Plumbing Materials';
  }

  if (sectionText === 'SECTION D') {
    if (categoryText.includes('EXCAVATION')) return 'Excavation';
    return 'Plumbing';
  }

  if (text.includes('inspection') || text.includes('assessing') || text.includes('travelling')) return 'Inspection';
  if (text.includes('geyser')) return 'Geyser';
  if (text.includes('leak detection') || text.includes('camera inspection')) return 'Leak Detection';
  if (text.includes('roof') || text.includes('waterproof')) return 'Roofing';
  if (text.includes('thatch')) return 'Thatching';
  if (text.includes('electrical') || text.includes('automation') || text.includes('gate motor') || text.includes('roll-up')) return 'Electrical';
  if (text.includes('emergency')) return 'Emergency';
  if (categoryText.includes('CARPENTER') || text.includes('door') || text.includes('skirting') || text.includes('handle') || text.includes('lock')) return 'Carpentry';
  if (categoryText.includes('DEMOLITION') || text.includes('break up') || text.includes('remove rubble')) return 'Demolition';
  if (categoryText.includes('EXCAVATION') || text.includes('excavation') || text.includes('filling to trenches')) return 'Excavation';
  if (text.includes('fencing') || text.includes('walling') || text.includes('pre-cast')) return 'Fencing & Walling';
  if (text.includes('tree')) return 'Tree Removal';
  if (text.includes('building') || text.includes('brick') || text.includes('concrete') || text.includes('plaster')) return 'Masonry & Building';
  if (text.includes('pipe') || text.includes('basin') || text.includes('toilet') || text.includes('bath')) return 'Plumbing';

  return 'General Labour';
}initDb();

const workbook = xlsx.readFile(workbookPath, { cellDates: false });
const insert = db.prepare(`
  INSERT INTO price_items (section, category, quote_group, item_code, description, unit, rate, source_sheet)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let imported = 0;
db.exec('BEGIN');
try {
  db.exec('DELETE FROM price_items');
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    for (const row of rows) {
      const description = normalise(pick(row, ['description', 'item', 'scope', 'work', 'service']));
      if (!description) continue;
      const rate = numberFrom(pick(row, ['rate', 'price', 'amount', 'cost']));
      if (!rate) continue;
      const section = normalise(pick(row, ['section'])) || sheetName;
      const category = normalise(pick(row, ['category', 'trade'])) || 'General';
      const quoteGroup = quoteGroupFor(section, category, description);
      const itemCode = normalise(pick(row, ['code', 'item no', 'item number']));
      const unit = normaliseUnit(pick(row, ['unit', 'uom', 'measure']));
      insert.run(section, category, quoteGroup, itemCode, description, unit, rate, sheetName);
      imported += 1;
    }
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

console.log(`Imported ${imported} rate items from ${path.basename(workbookPath)}.`);