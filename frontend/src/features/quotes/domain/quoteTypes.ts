import type { PriceItemDto, PriceTradeDto, QuoteDto, QuoteItemDto } from '../../../services/apiDtos';

export type Trade = PriceTradeDto;
export type PriceItem = PriceItemDto;

export interface QuoteAppointmentContext {
  id: number;
  client_name?: string | null;
  customer_name: string;
  site_address: string;
  request_details: string;
}

export interface SelectedQuoteItem {
  selectionId: string;
  priceItemId: number;
  tradeCode: string;
  tradeName: string;
  location: string;
  category: string;
  description: string;
  unit: string;
  quantity: number | '';
  enteredRate: number | '';
  requiresRateInput: boolean;
  pricingMode?: string | null;
  markupPercentage?: number | null;
  automaticStartupFee: boolean;
}

export type ExistingQuoteItem = QuoteItemDto;
export type ExistingQuote = QuoteDto;
