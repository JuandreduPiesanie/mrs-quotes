import { normalizeQuoteUnit } from '../../../shared/quote/quoteFormatters';
import type { ExistingQuote, PriceItem, SelectedQuoteItem } from './quoteTypes';

export function createSelectedItem(item: PriceItem): SelectedQuoteItem {
  return {
    priceItemId: item.id,
    tradeCode: item.trade_code,
    tradeName: item.trade_name,
    category: item.category,
    description: item.description,
    unit: normalizeQuoteUnit(item.unit),
    quantity: 1,
    enteredRate: '',
    requiresRateInput: item.requires_rate_input,
    pricingMode: item.pricing_mode,
    markupPercentage: item.markup_percentage,
    automaticStartupFee: item.automatic_startup_fee
  };
}

export function restoreSelectedItems(quote: ExistingQuote): SelectedQuoteItem[] {
  const automaticFees = quote.items.filter((item) => item.system_generated);
  return quote.items.filter((item) => !item.system_generated).map((item) => ({
    priceItemId: item.price_item_id,
    tradeCode: item.trade_code,
    tradeName: item.trade_name,
    category: item.category,
    description: item.description,
    unit: normalizeQuoteUnit(item.unit),
    quantity: item.quantity,
    enteredRate: item.input_amount ?? '',
    requiresRateInput: item.input_amount !== null,
    automaticStartupFee: automaticFees.some((fee) => fee.trade_code === item.trade_code)
      || ((item.trade_code === 'geyser' || item.trade_code === 'general-plumbing')
        && automaticFees.some((fee) => fee.description.toLowerCase().includes('plumbing')))
  }));
}

export function isQuoteReadyForReview(items: SelectedQuoteItem[]) {
  return items.length > 0 && items.every((item) => Number(item.quantity) > 0
    && (!item.requiresRateInput || (item.enteredRate !== '' && Number(item.enteredRate) >= 0)));
}
