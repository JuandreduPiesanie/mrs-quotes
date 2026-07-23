import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Home,
  ImagePlus,
  LockKeyhole,
  Minus,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Wrench
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { PageTitle } from '../../shared/components/PageTitle';
import { normalizeQuoteUnit, quoteQuantityLabel } from '../../shared/quote/quoteFormatters';
import { getApiErrorMessage, useGetPriceItemsQuery, useGetQuoteQuery, useGetTradesQuery, useSubmitQuoteMutation, useUpdateQuoteMutation } from '../../services/baseApi';
import { preparePhotosForUpload } from './domain/photoService';
import { restoreSelectedItems } from './domain/quoteRules';
import type { PriceItem, QuoteAppointmentContext, SelectedQuoteItem, Trade } from './domain/quoteTypes';
import {
  activeTradeChanged,
  catalogCategoryChanged,
  catalogSearchChanged,
  enteredRateChanged,
  lineItemAdded,
  lineItemRemoved,
  quantityChanged,
  quoteWizardReset,
  quoteWizardRestored,
  stepChanged,
  tradeRemoved,
  tradeSelected
} from './state/quoteWizardSlice';
import { selectCanReviewQuote, selectQuoteWizard } from './state/quoteWizardSelectors';
import type { QuotePayloadDto } from '../../services/apiDtos';
interface TradeGroup {
  name: string;
  trades: Trade[];
}

const TRADE_GROUP_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
  Plumbing: { label: 'Plumbing', description: 'Plumbing installations, repairs and related services.', icon: Wrench },
  Building: { label: 'Building & Maintenance', description: 'General building works, carpentry, painting and more.', icon: Building2 },
  'Electrical & Security': { label: 'Electrical & Security', description: 'Electrical installations, security systems and automation.', icon: ShieldCheck },
  Roofing: { label: 'Roofing', description: 'Roofing, waterproofing and roof maintenance.', icon: Home },
  'Specialist Services': { label: 'Specialist Services', description: 'Specialist installations and equipment services.', icon: Settings },
  'Professional Services': { label: 'Professional Services', description: 'Inspections, assessments and professional reporting.', icon: ClipboardCheck }
};

interface QuoteWizardStepperProps {
  step: 1 | 2 | 3;
  canOpenItems: boolean;
  canReview: boolean;
  onChange: (step: 1 | 2 | 3) => void;
}

function QuoteWizardStepper({ step, canOpenItems, canReview, onChange }: QuoteWizardStepperProps) {
  const steps: { number: 1 | 2 | 3; label: string; enabled: boolean }[] = [
    { number: 1, label: 'Choose trades', enabled: true },
    { number: 2, label: 'Add line items', enabled: canOpenItems },
    { number: 3, label: 'Review & submit', enabled: canReview }
  ];

  return (
    <div className="quote-wizard-stepper" aria-label="Quote progress">
      {steps.map((item, index) => {
        const complete = step > item.number;
        const active = step === item.number;
        return (
          <React.Fragment key={item.number}>
            {index > 0 && <span className={complete || active ? 'step-connector active' : 'step-connector'} />}
            <button type="button" className={active ? 'wizard-step active' : complete ? 'wizard-step complete' : 'wizard-step'} disabled={!item.enabled} onClick={() => item.enabled && onChange(item.number)}>
              <span>{complete ? <Check size={17} /> : item.number}</span>
              <strong>{item.label}</strong>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface TradeSelectionStepProps {
  tradeGroups: TradeGroup[];
  selectedTradeCodes: string[];
  onToggle: (code: string) => void;
  onContinue: () => void;
}

function TradeSelectionStep({ tradeGroups, selectedTradeCodes, onToggle, onContinue }: TradeSelectionStepProps) {
  const [expandedGroup, setExpandedGroup] = useState('Plumbing');
  const [search, setSearch] = useState('');
  const selectedTrades = tradeGroups.flatMap((group) => group.trades).filter((trade) => selectedTradeCodes.includes(trade.code));
  const term = search.trim().toLowerCase();
  const visibleGroups = tradeGroups.filter((group) => !term
    || (TRADE_GROUP_META[group.name]?.label || group.name).toLowerCase().includes(term)
    || group.trades.some((trade) => trade.name.toLowerCase().includes(term)));

  return (
    <div className="quote-wizard-layout">
      <div className="panel wizard-main-panel">
        <div className="wizard-panel-heading">
          <div><span>Step 1</span><h2>Choose the work areas that apply</h2></div>
          <p>Select every relevant trade. You can edit this before submitting.</p>
        </div>
        <label className="catalog-search wizard-search">
          <Search size={19} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a trade" />
        </label>

        <div className="wizard-trade-groups">
          {visibleGroups.map((group) => {
            const meta = TRADE_GROUP_META[group.name] || { label: group.name, description: '', icon: ClipboardList };
            const Icon = meta.icon;
            const isExpanded = expandedGroup === group.name || Boolean(term);
            const selectedCount = group.trades.filter((trade) => selectedTradeCodes.includes(trade.code)).length;
            return (
              <section className={isExpanded ? 'wizard-trade-group expanded' : 'wizard-trade-group'} key={group.name}>
                <button type="button" className="wizard-trade-group-toggle" onClick={() => setExpandedGroup(isExpanded && !term ? '' : group.name)}>
                  <span className="trade-group-icon"><Icon size={24} /></span>
                  <span className="trade-group-copy"><strong>{meta.label}</strong><small>{meta.description}</small></span>
                  <span className="trade-group-count">{selectedCount} selected</span>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                {isExpanded && (
                  <div className="wizard-trade-options">
                    {group.trades.map((trade) => {
                      const selected = selectedTradeCodes.includes(trade.code);
                      return (
                        <button type="button" key={trade.code} className={selected ? 'wizard-trade-option selected' : 'wizard-trade-option'} onClick={() => onToggle(trade.code)} aria-pressed={selected}>
                          <span className="trade-checkbox">{selected && <Check size={16} />}</span>
                          <strong>{trade.name}</strong>
                          <small>{trade.item_count} items</small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <aside className="panel wizard-side-panel trade-summary-panel">
        <h2>Quote summary</h2>
        <p className="muted">Selected trades</p>
        <div className="selected-trade-list">
          {selectedTrades.map((trade) => (
            <div key={trade.code}><Check size={16} /><span>{trade.name}</span><button type="button" onClick={() => onToggle(trade.code)} aria-label={`Remove ${trade.name}`}>×</button></div>
          ))}
          {selectedTrades.length === 0 && <div className="empty compact-empty">No trades selected yet.</div>}
        </div>
        <div className="trade-selection-total"><strong>{selectedTrades.length}</strong><span>{selectedTrades.length === 1 ? 'trade selected' : 'trades selected'}<small>Line items are added in the next step.</small></span></div>
        <button type="button" className="primary wizard-primary" disabled={selectedTrades.length === 0} onClick={onContinue}>Continue to line items<ArrowRight size={18} /></button>
      </aside>
    </div>
  );
}

interface QuoteBasketProps {
  selected: SelectedQuoteItem[];
  onQuantity: (id: number, value: number | string) => void;
  onRate: (id: number, value: number | string) => void;
  onRemove: (id: number) => void;
}

function QuoteBasket({ selected, onQuantity, onRate, onRemove }: QuoteBasketProps) {
  return (
    <aside className="panel wizard-side-panel quote-basket">
      <h2>Quote basket</h2>
      {selected.length === 0 && <div className="empty compact-empty">Add line items from the catalogue.</div>}
      <div className="basket-lines">
        {selected.map((item) => (
          <div className="basket-line" key={item.priceItemId}>
            <div className="basket-line-heading"><strong>{item.description}</strong><button type="button" onClick={() => onRemove(item.priceItemId)} aria-label={`Remove ${item.description}`}><Trash2 size={16} /></button></div>
            <span>{item.tradeName}</span>
            <div className="quantity-control">
              <button type="button" onClick={() => onQuantity(item.priceItemId, Math.max(0.01, Number(item.quantity || 0) - 1))}><Minus size={15} /></button>
              <input required aria-label={`Quantity for ${item.description}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => onQuantity(item.priceItemId, e.target.value)} />
              <button type="button" onClick={() => onQuantity(item.priceItemId, Number(item.quantity || 0) + 1)}><Plus size={15} /></button>
              <small>{normalizeQuoteUnit(item.unit)}</small>
            </div>
            {item.requiresRateInput && (
              <label>{item.pricingMode === 'manual' ? 'Calculated rate excl. VAT' : `Supplier cost excl. VAT${item.markupPercentage ? ` (+${item.markupPercentage}%)` : ''}`}
                <input required type="number" min="0" step="0.01" value={item.enteredRate} onChange={(e) => onRate(item.priceItemId, e.target.value)} />
              </label>
            )}
          </div>
        ))}
      </div>
      {selected.some((item) => item.automaticStartupFee) && <div className="basket-automatic-fee"><Check size={18} />Automatic startup fee will be included</div>}
    </aside>
  );
}

interface LineItemSelectionStepProps extends QuoteBasketProps {
  trades: Trade[];
  selectedTradeCodes: string[];
  activeTrade: string;
  onActiveTrade: (code: string) => void;
  items: PriceItem[];
  search: string;
  onSearch: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  canReview: boolean;
  onAdd: (item: PriceItem) => void;
  onBack: () => void;
  onReview: () => void;
}

function LineItemSelectionStep({ trades, selectedTradeCodes, activeTrade, onActiveTrade, items, search, onSearch, category, onCategory, selected, canReview, onAdd, onQuantity, onRate, onRemove, onBack, onReview }: LineItemSelectionStepProps) {
  const activeTradeDetails = trades.find((trade) => trade.code === activeTrade);
  const categories: string[] = [...new Set<string>(items.map((item) => String(item.category)))];
  const term = search.trim().toLowerCase();
  const visibleItems = items.filter((item) => (category === 'All' || item.category === category)
    && (!term || item.description.toLowerCase().includes(term) || item.category.toLowerCase().includes(term)));
  const selectedIds = new Set(selected.map((item) => item.priceItemId));
  const hasStartupRule = items.some((item) => item.automatic_startup_fee);

  return (
    <div className="quote-wizard-layout">
      <div className="panel wizard-main-panel">
        <div className="wizard-panel-heading item-step-heading">
          <div><span>Step 2</span><h2>Add line items</h2></div>
          <button type="button" className="text-button" onClick={onBack}>Edit trades</button>
        </div>
        <div className="selected-trade-tabs">
          {selectedTradeCodes.map((code) => {
            const trade = trades.find((item) => item.code === code);
            if (!trade) return null;
            return <button type="button" key={code} className={activeTrade === code ? 'active' : ''} onClick={() => onActiveTrade(code)}>{trade.name}</button>;
          })}
        </div>
        <label className="catalog-search wizard-search">
          <Search size={19} />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={`Search ${activeTradeDetails?.name || 'trade'} items`} />
        </label>
        <div className="category-filter-tabs">
          {['All', ...categories].map((name) => <button type="button" key={name} className={category === name ? 'active' : ''} onClick={() => onCategory(name)}>{name}</button>)}
        </div>
        {hasStartupRule && <div className="automatic-fee-note"><LockKeyhole size={17} />The applicable startup fee will be added automatically once.</div>}
        <div className="wizard-item-list">
          {visibleItems.map((item) => {
            const added = selectedIds.has(item.id);
            return (
              <div className={added ? 'wizard-item-row added' : 'wizard-item-row'} key={item.id}>
                <div><strong>{item.description}</strong>{item.pricing_note && <small>{item.pricing_note}</small>}</div>
                <span>{normalizeQuoteUnit(item.unit)}</span>
                <button type="button" disabled={added} onClick={() => onAdd(item)}>{added ? <><Check size={16} />Added</> : <><Plus size={16} />Add</>}</button>
              </div>
            );
          })}
          {visibleItems.length === 0 && <div className="empty">No matching line items.</div>}
        </div>
        <div className="wizard-mobile-actions"><button type="button" className="secondary" onClick={onBack}>Back</button><button type="button" className="primary" disabled={!canReview} onClick={onReview}>Review quote ({selected.length})</button></div>
      </div>

      <div className="wizard-side-stack">
        <QuoteBasket selected={selected} onQuantity={onQuantity} onRate={onRate} onRemove={onRemove} />
        <div className="wizard-side-actions"><button type="button" className="secondary" onClick={onBack}>Back</button><button type="button" className="primary" disabled={!canReview} onClick={onReview}>Review quote ({selected.length} {selected.length === 1 ? 'item' : 'items'})<ArrowRight size={18} /></button></div>
      </div>
    </div>
  );
}

function LocalPhotoPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <div className="local-photo-preview">{url && <img src={url} alt={file.name} />}<button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}>×</button></div>;
}

interface QuoteReviewStepProps {
  selected: SelectedQuoteItem[];
  photos: File[];
  existingPhotoCount: number;
  onPhotos: (files: File[]) => void;
  onRemovePhoto: (index: number) => void;
  onBack: () => void;
  message: string;
  submitting: boolean;
  isEditing: boolean;
}

function QuoteReviewStep({ selected, photos, existingPhotoCount, onPhotos, onRemovePhoto, onBack, message, submitting, isEditing }: QuoteReviewStepProps) {
  const [openTrade, setOpenTrade] = useState(selected[0]?.tradeCode || '');
  const groups = selected.reduce<{ code: string; name: string; items: SelectedQuoteItem[] }[]>((result, item) => {
    const group = result.find((entry) => entry.code === item.tradeCode);
    if (group) group.items.push(item);
    else result.push({ code: item.tradeCode, name: item.tradeName, items: [item] });
    return result;
  }, []);
  const photoCount = photos.length + existingPhotoCount;

  return (
    <div className="quote-wizard-layout">
      <div className="panel wizard-main-panel review-panel">
        <div className="wizard-panel-heading"><div><span>Step 3</span><h2>Review quote scope</h2></div><p>Confirm quantities, automatic rules and photos before submitting.</p></div>
        <div className="review-trade-groups">
          {groups.map((group) => {
            const open = openTrade === group.code;
            const hasStartup = group.items.some((item) => item.automaticStartupFee);
            return (
              <section className={open ? 'review-trade-group open' : 'review-trade-group'} key={group.code}>
                <button type="button" onClick={() => setOpenTrade(open ? '' : group.code)}>{open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}<strong>{group.name}</strong><span>{group.items.length} {group.items.length === 1 ? 'item' : 'items'}</span></button>
                {open && <div className="review-trade-lines">{group.items.map((item) => <div key={item.priceItemId}><span>{item.description}</span><strong>{quoteQuantityLabel(item.quantity, item.unit)}</strong></div>)}{hasStartup && <div className="review-startup-line"><LockKeyhole size={17} /><span>Applicable startup fee — added automatically</span></div>}</div>}
              </section>
            );
          })}
        </div>

        <div className="review-photos">
          <h3>Site photos</h3>
          <div className="review-photo-grid">
            <label className="review-upload-box"><ImagePlus size={25} /><strong>Add site photos</strong><span>JPG, PNG or HEIC · Up to 50 photos</span><input type="file" multiple accept="image/*" onChange={(e) => onPhotos([...e.target.files])} /></label>
            {photos.map((file, index) => <LocalPhotoPreview key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => onRemovePhoto(index)} />)}
            {existingPhotoCount > 0 && <div className="existing-photo-count"><Camera size={22} /><strong>{existingPhotoCount}</strong><span>existing photos</span></div>}
          </div>
        </div>
      </div>

      <aside className="panel wizard-side-panel ready-panel">
        <h2>Ready to submit</h2>
        <div className="ready-checks"><div><Check size={19} /><span>{groups.length} trades selected</span></div><div><Check size={19} /><span>{selected.length} line items</span></div><div><Check size={19} /><span>Startup fees checked automatically</span></div><div><Check size={19} /><span>{photoCount} site photos attached</span></div></div>
        <div className="pricing-hidden-note">Pricing remains hidden from the assessor.</div>
        {message && <div className={message.includes('submitted') || message.includes('updated') ? 'success' : submitting ? 'wizard-info' : 'error'}>{message}</div>}
        <button type="button" className="secondary" onClick={onBack}>Back to line items</button>
        <button className="primary" disabled={submitting}><Send size={18} />{submitting ? 'Preparing quote...' : isEditing ? 'Save quote' : 'Submit quote'}</button>
        <small>This sends the quote to the assigned Quote Administrator.</small>
      </aside>
    </div>
  );
}


interface QuoteBuilderProps {
  appointment: QuoteAppointmentContext;
  quoteId: number | null;
  onDone: () => void;
}

export function QuoteBuilder({ appointment, quoteId, onDone }: QuoteBuilderProps) {
  const dispatch = useAppDispatch();
  const wizard = useAppSelector(selectQuoteWizard);
  const canReview = useAppSelector(selectCanReviewQuote);
  const { step, selectedTradeCodes, activeTradeCode, catalogSearch, catalogCategory, selectedItems } = wizard;
  const { data: trades = [], error: tradesError } = useGetTradesQuery();
  const { data: catalogItems = [], error: catalogError } = useGetPriceItemsQuery(activeTradeCode, { skip: !activeTradeCode });
  const { data: existingQuote, error: quoteError } = useGetQuoteQuery(quoteId, { skip: !quoteId });
  const [submitQuote] = useSubmitQuoteMutation();
  const [updateQuote] = useUpdateQuoteMutation();
  const [photos, setPhotos] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (quoteId) return;
    dispatch(quoteWizardReset());
    setPhotos([]);
    setMessage('');
  }, [dispatch, quoteId, appointment?.id]);

  useEffect(() => {
    if (!existingQuote) return;
    const items = restoreSelectedItems(existingQuote);
    const tradeCodes = [...new Set(items.map((item) => item.tradeCode).filter(Boolean))];
    dispatch(quoteWizardRestored({ items, tradeCodes }));
  }, [dispatch, existingQuote]);

  useEffect(() => {
    const error = tradesError || catalogError || quoteError;
    if (error) setMessage(getApiErrorMessage(error));
  }, [tradesError, catalogError, quoteError]);

  const tradeGroups = useMemo(() => {
    const groups = trades.reduce((result, trade) => {
      const group = result.find((entry) => entry.name === trade.group);
      if (group) group.trades.push(trade);
      else result.push({ name: trade.group, trades: [trade] });
      return result;
    }, []);
    const order = ['Plumbing', 'Building', 'Electrical & Security', 'Roofing', 'Specialist Services', 'Professional Services'];
    return groups.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }, [trades]);

  function toggleTrade(code: string) {
    if (selectedTradeCodes.includes(code)) {
      const affectedItems = selectedItems.filter((item) => item.tradeCode === code);
      if (affectedItems.length > 0) {
        const tradeName = trades.find((trade) => trade.code === code)?.name || 'this trade';
        if (!window.confirm(`Remove ${tradeName}? Its ${affectedItems.length} selected line item(s) will also be removed.`)) return;
      }
      dispatch(tradeRemoved(code));
      return;
    }
    dispatch(tradeSelected(code));
  }

  function openLineItems() {
    const nextTrade = activeTradeCode && selectedTradeCodes.includes(activeTradeCode) ? activeTradeCode : selectedTradeCodes[0];
    if (nextTrade !== activeTradeCode) dispatch(activeTradeChanged(nextTrade || ''));
    setMessage('');
    dispatch(stepChanged(2));
  }

  function openReview() {
    if (!canReview) {
      setMessage('Complete every quantity and required excl. VAT amount before reviewing the quote.');
      return;
    }
    setMessage('');
    dispatch(stepChanged(3));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3 || !canReview) {
      openReview();
      return;
    }

    setMessage('');
    setSubmitting(true);
    try {
      setMessage(photos.length ? 'Optimizing photos for upload...' : '');
      const preparedPhotos = await preparePhotosForUpload(photos);
      const body = new FormData();
      const payload: QuotePayloadDto = {
        appointmentId: appointment?.id,
        items: selectedItems.map((item) => ({
          priceItemId: item.priceItemId,
          quantity: Number(item.quantity),
          enteredRate: item.requiresRateInput ? Number(item.enteredRate) : null
        }))
      };
      body.append('payload', JSON.stringify(payload));
      preparedPhotos.forEach((file) => body.append('photos', file));
      if (existingQuote) await updateQuote({ id: existingQuote.id, body }).unwrap();
      else await submitQuote(body).unwrap();
      setMessage(existingQuote ? 'Quote updated.' : 'Quote submitted to the quote administrator.');
      window.setTimeout(onDone, 600);
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!appointment) {
    return (
      <section className="workspace narrow">
        <PageTitle title="Quick Quote" subtitle="Select an appointment from the calendar to start a quote." />
        <div className="empty">Open the calendar and select an appointment to begin.</div>
      </section>
    );
  }

  return (
    <section className="workspace quote-wizard-workspace">
      <div className="quote-wizard-title-row"><PageTitle title={existingQuote ? `Edit ${existingQuote.quote_number}` : 'Quick Estimate'} subtitle="A guided scope workflow for field assessors. Pricing stays hidden." /><span>OUTsurance 2026 rate schedule</span></div>
      <div className="panel quote-wizard-context">
        <div><span>Client</span><strong>{appointment.client_name || appointment.customer_name}</strong></div>
        <div><span>Site address</span><strong>{appointment.site_address}</strong></div>
        <div><span>Request</span><strong>{appointment.request_details}</strong></div>
      </div>
      <QuoteWizardStepper step={step} canOpenItems={selectedTradeCodes.length > 0} canReview={canReview} onChange={(nextStep) => dispatch(stepChanged(nextStep))} />
      {message && step !== 3 && <div className="error wizard-page-message">{message}</div>}

      <form className="quote-wizard-form" onSubmit={submit}>
        {step === 1 && <TradeSelectionStep tradeGroups={tradeGroups} selectedTradeCodes={selectedTradeCodes} onToggle={toggleTrade} onContinue={openLineItems} />}
        {step === 2 && <LineItemSelectionStep
          trades={trades}
          selectedTradeCodes={selectedTradeCodes}
          activeTrade={activeTradeCode}
          onActiveTrade={(code) => dispatch(activeTradeChanged(code))}
          items={catalogItems}
          search={catalogSearch}
          onSearch={(value) => dispatch(catalogSearchChanged(value))}
          category={catalogCategory}
          onCategory={(value) => dispatch(catalogCategoryChanged(value))}
          selected={selectedItems}
          canReview={canReview}
          onAdd={(item) => dispatch(lineItemAdded(item))}
          onQuantity={(id, value) => dispatch(quantityChanged({ id, quantity: value === '' ? '' : Number(value) }))}
          onRate={(id, value) => dispatch(enteredRateChanged({ id, enteredRate: value === '' ? '' : Number(value) }))}
          onRemove={(id) => dispatch(lineItemRemoved(id))}
          onBack={() => dispatch(stepChanged(1))}
          onReview={openReview}
        />}
        {step === 3 && <QuoteReviewStep
          selected={selectedItems}
          photos={photos}
          existingPhotoCount={existingQuote?.photo_count || 0}
          onPhotos={(files) => setPhotos((current) => [...current, ...files].slice(0, Math.max(0, 50 - (existingQuote?.photo_count || 0))))}
          onRemovePhoto={(index) => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          onBack={() => dispatch(stepChanged(2))}
          message={message}
          submitting={submitting}
          isEditing={Boolean(existingQuote)}
        />}
      </form>
    </section>
  );
}
