export function normalizeQuoteUnit(unit?: string | number | null) {
  const value = String(unit || 'item').trim();
  return /^\d+(?:[.,]\d+)?$/.test(value) ? 'item' : value;
}

export function quoteQuantityLabel(quantity: string | number, unit?: string | number | null) {
  return `${quantity} ${normalizeQuoteUnit(unit)}`;
}
