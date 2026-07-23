import type { Role } from '../app/roles';

export type IsoDateTime = string;
export type QuoteStatus = 'submitted' | 'completed';
export type CalendarEntryType = 'appointment' | 'quote_task';
export type PricingMode = 'fixed' | 'cost' | 'cost_plus' | 'manual';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface FirstAdminRequestDto extends LoginRequestDto {
  name: string;
}

export interface SetupStatusDto {
  setup_available: boolean;
}

export interface UserSessionDto {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResultDto {
  token: string;
  user: UserSessionDto;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  quote_administrator_id: number | null;
  quote_administrator_name: string | null;
  created_at: IsoDateTime;
}

export interface CreateUserRequestDto {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface AssignQuoteAdministratorRequestDto {
  assessorId: number;
  quoteAdministratorId: number | null;
}

export interface ClientDto {
  id: number;
  name: string;
}

export interface PriceTradeDto {
  code: string;
  name: string;
  group: string;
  item_count: number;
}

export interface PriceItemDto {
  id: number;
  section: string;
  category: string;
  trade_code: string;
  trade_name: string;
  trade_group: string;
  item_code: string | null;
  description: string;
  unit: string;
  rate: number | null;
  pricing_mode: PricingMode;
  markup_percentage: number | null;
  pricing_note: string | null;
  requires_rate_input: boolean;
  automatic_startup_fee: boolean;
}

export interface AppointmentRequestDto {
  assessorId: number;
  clientId: number;
  siteAddress: string;
  requestDetails: string;
  appointmentStart: IsoDateTime;
  appointmentEnd: IsoDateTime | null;
}

export interface AppointmentDto {
  id: number | null;
  quote_id: number | null;
  quote_number: string | null;
  assessor_id: number;
  assessor_name: string;
  client_id: number | null;
  client_name: string | null;
  customer_name: string;
  site_address: string;
  request_details: string;
  appointment_start: IsoDateTime;
  appointment_end: IsoDateTime | null;
  status: string;
  subtotal: number | null;
  quote_administrator_id: number | null;
  quote_administrator_name: string | null;
  calendar_type: CalendarEntryType;
}

export interface QuoteItemInputDto {
  priceItemId: number;
  location: string;
  quantity: number;
  enteredRate: number | null;
}

export interface QuotePayloadDto {
  appointmentId: number;
  items: QuoteItemInputDto[];
}

export interface CompleteQuoteRequestDto {
  id: number;
  erpQuoteNumber: string;
  photoArchiveUrl: string;
  archiveVerified: boolean;
}

export interface QuoteCreatedDto {
  id: number;
  quoteNumber: string;
  message: string;
}

export interface OperationResultDto {
  id: number;
  message: string;
}

export interface QuoteItemDto {
  id: number;
  price_item_id: number;
  trade_code: string;
  trade_name: string;
  location: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  input_amount: number | null;
  unit_rate: number;
  line_total: number;
  system_generated: boolean;
}

export interface QuotePhotoDto {
  id: number;
  original_name: string;
  mime_type: string;
  created_at: IsoDateTime;
  url: string;
}

export interface QuoteDto {
  id: number;
  assessor_id: number;
  assessor_name: string;
  quote_administrator_id: number | null;
  quote_administrator_name: string | null;
  appointment_id: number | null;
  client_id: number | null;
  quote_number: string;
  customer_name: string;
  site_address: string;
  request_details: string;
  status: QuoteStatus;
  subtotal: number;
  erp_quote_number: string | null;
  photo_archive_url: string | null;
  archived_photo_count: number;
  photos_purged_at: IsoDateTime | null;
  photo_purge_eligible_at: IsoDateTime | null;
  completed_at: IsoDateTime | null;
  created_at: IsoDateTime;
  photo_count: number;
  items: QuoteItemDto[];
  photos: QuotePhotoDto[];
}

export interface ValidationProblemDto {
  error?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}
