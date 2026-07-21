import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Box,
  Button as MuiButton,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DataGrid } from '@mui/x-data-grid';
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  ClipboardList,
  Clock,
  Download,
  LogOut,
  MapPin,
  Plus,
  Search,
  Send,
  UserRound
} from 'lucide-react';
import mrsLogo from './assets/mrs-logo.png';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '/api';
const ROLES = {
  ADMIN: 'admin',
  MANAGEMENT: 'management',
  SCHEDULE_ADMINISTRATOR: 'schedule_administrator',
  QUOTE_ADMINISTRATOR: 'quote_administrator',
  ASSESSOR: 'assessor'
};
const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGEMENT]: 'Management',
  [ROLES.SCHEDULE_ADMINISTRATOR]: 'Schedule Administrator',
  [ROLES.QUOTE_ADMINISTRATOR]: 'Quote Administrator',
  [ROLES.ASSESSOR]: 'Quote Assessor'
};

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('mrs-session') || 'null'));
  const [view, setView] = useState('calendar');
  const [quoteAppointment, setQuoteAppointment] = useState(null);
  const [quoteToEditId, setQuoteToEditId] = useState(null);
  const [quoteToOpenId, setQuoteToOpenId] = useState(null);

  const api = useMemo(() => createApi(session?.token), [session?.token]);

  function saveSession(next) {
    setSession(next);
    localStorage.setItem('mrs-session', JSON.stringify(next));
  }

  function logout() {
    setSession(null);
    localStorage.removeItem('mrs-session');
  }

  if (!session) return <Login onLogin={saveSession} />;

  const role = session.user.role;
  const isAdmin = role === ROLES.ADMIN;
  const isAssessor = role === ROLES.ASSESSOR;
  const isScheduleAdministrator = role === ROLES.SCHEDULE_ADMINISTRATOR;
  const isQuoteAdministrator = role === ROLES.QUOTE_ADMINISTRATOR;
  const isManagement = role === ROLES.MANAGEMENT;
  const canBuildQuotes = isAssessor || isAdmin;
  const canViewQuotes = isAdmin || isAssessor || isQuoteAdministrator || isManagement;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand logo-brand">
          <img className="brand-logo" src={mrsLogo} alt="Maintenance Risk Solutions" />
          <span>{ROLE_LABELS[role] || 'MRS User'}</span>
        </div>

        <nav>

          <NavButton icon={<CalendarDays />} label="Calendar" active={view === 'calendar'} onClick={() => setView('calendar')} />
          {canViewQuotes && <NavButton icon={<ClipboardList />} label={isAssessor ? 'My Quotes' : 'Outstanding Quotes'} active={view === 'quotes'} onClick={() => setView('quotes')} />}
          {(isAdmin || isScheduleAdministrator) && <NavButton icon={<Plus />} label="Schedule" active={view === 'schedule'} onClick={() => setView('schedule')} />}
          {(isAdmin || isManagement) && <NavButton icon={<UserRound />} label="Assignments" active={view === 'assignments'} onClick={() => setView('assignments')} />}
          {isAdmin && <NavButton icon={<Plus />} label="Users" active={view === 'users'} onClick={() => setView('users')} />}
        </nav>

        <div className="profile">
          <UserRound size={18} />
          <div>
            <strong>{session.user.name}</strong>
            <span>{session.user.email}</span>
          </div>
          <button className="icon-button" onClick={logout} title="Log out"><LogOut size={18} /></button>
        </div>
      </aside>

      <main>
        {canBuildQuotes && view === 'quote' && <QuoteBuilder api={api} appointment={quoteAppointment} quoteId={quoteToEditId} onDone={() => { setQuoteAppointment(null); setQuoteToEditId(null); setView('calendar'); }} />}
        {view === 'calendar' && <CalendarView api={api} role={role} onStartQuote={(appointment) => { setQuoteAppointment(appointment); setQuoteToEditId(appointment.quote_id || null); setView('quote'); }} onOpenQuote={(quoteId) => { setQuoteToOpenId(quoteId); setView('quotes'); }} />}
        {view === 'quotes' && canViewQuotes && <QuotesView api={api} role={role} initialQuoteId={quoteToOpenId} onOpenedInitialQuote={() => setQuoteToOpenId(null)} />}
        {(isAdmin || isScheduleAdministrator) && view === 'schedule' && <ScheduleView api={api} onCreated={() => setView('calendar')} />}
        {(isAdmin || isManagement) && view === 'assignments' && <AssignmentsView api={api} />}
        {isAdmin && view === 'users' && <UsersView api={api} />}
      </main>
    </div>
  );
}

function createApi(token) {
  function getErrorMessage(data, fallback) {
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
    const validationMessage = data?.errors && Object.values(data.errors).flat()[0];
    return validationMessage || fallback;
  }

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(getErrorMessage(data, 'Something went wrong.'));
    return data;
  }
  async function downloadQuotePhotos(id) {
    const result = await request(`/quotes/${id}/photos-download`, { method: 'POST' });
    const link = document.createElement('a');
    link.href = `${API}${result.url}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  async function loadPhoto(path) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, { headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(getErrorMessage(data, 'Photo could not be loaded.'));
    }
    return URL.createObjectURL(await res.blob());
  }
  return {
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    setupFirstAdmin: (name, email, password) => request('/auth/setup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    trades: () => request('/price-trades'),
    prices: (trade) => request(`/price-items${trade ? `?trade=${encodeURIComponent(trade)}` : ''}`),
    appointments: (assessorId) => request(`/appointments${assessorId ? `?assessorId=${assessorId}` : ''}`),
    assessors: () => request('/users/assessors'),
    quoteAdministrators: () => request('/users/quote-administrators'),
    users: () => request('/users'),
    createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
    assignQuoteAdministrator: (assessorId, quoteAdministratorId) => request(`/users/assessors/${assessorId}/quote-administrator`, {
      method: 'PATCH',
      body: JSON.stringify({ quoteAdministratorId })
    }),
    clients: (search = '') => request(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    createAppointment: (body) => request('/appointments', { method: 'POST', body: JSON.stringify(body) }),
    updateAppointment: (id, body) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    cancelAppointment: (id) => request(`/appointments/${id}/cancel`, { method: 'PATCH' }),
    quotes: (assessorId, status = 'submitted') => {
      const params = new URLSearchParams({ status });
      if (assessorId && assessorId !== 'all') params.set('assessorId', assessorId);
      return request(`/quotes?${params.toString()}`);
    },
    quote: (id) => request(`/quotes/${id}`),
    loadPhoto,
    downloadQuotePhotos,
    submitQuote: (form) => request('/quotes', { method: 'POST', body: form }),
    updateQuote: (id, form) => request(`/quotes/${id}`, { method: 'PUT', body: form }),
    completeQuote: (id, erpQuoteNumber, photoArchiveUrl, archiveVerified) => request(`/quotes/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ erpQuoteNumber, photoArchiveUrl, archiveVerified })
    }),
  };
}

function Login({ onLogin }) {
  const api = useMemo(() => createApi(), []);
  const [setupMode, setSetupMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      onLogin(setupMode
        ? await api.setupFirstAdmin(name, email, password)
        : await api.login(email, password));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <img className="login-logo" src={mrsLogo} alt="Maintenance Risk Solutions" />
        <p>{setupMode ? 'Create the first system administrator.' : 'Sign in to create on-site estimates, upload photos, and manage quote appointments.'}</p>
        {setupMode && <label>Full name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>}
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary">{setupMode ? 'Create administrator' : 'Sign in'}</button>
        <button className="secondary" type="button" onClick={() => { setSetupMode(!setupMode); setError(''); }}>
          {setupMode ? 'Back to sign in' : 'First-time setup'}
        </button>
      </form>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return <button className={active ? 'nav active' : 'nav'} onClick={onClick}>{React.cloneElement(icon, { size: 19 })}<span>{label}</span></button>;
}

function TradeItemPicker({ api, onAdd, onTradeRemoved, initialTradeCodes = [] }) {
  const [trades, setTrades] = useState([]);
  const [selectedTradeCodes, setSelectedTradeCodes] = useState([]);
  const [activeTrade, setActiveTrade] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const initialTradeKey = [...new Set(initialTradeCodes.filter(Boolean))].sort().join('|');

  useEffect(() => {
    api.trades().then(setTrades).catch((err) => setError(err.message));
  }, [api]);

  useEffect(() => {
    if (!initialTradeKey) return;
    const codes = initialTradeKey.split('|');
    setSelectedTradeCodes(codes);
    setActiveTrade((current) => current || codes[0]);
  }, [initialTradeKey]);

  useEffect(() => {
    setSearch('');
    if (!activeTrade) {
      setItems([]);
      return;
    }
    api.prices(activeTrade).then(setItems).catch((err) => setError(err.message));
  }, [api, activeTrade]);

  const tradeGroups = useMemo(() => trades.reduce((groups, trade) => {
    const group = groups.find((entry) => entry.name === trade.group);
    if (group) group.trades.push(trade);
    else groups.push({ name: trade.group, trades: [trade] });
    return groups;
  }, []), [trades]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => !term
      || item.description.toLowerCase().includes(term)
      || item.category.toLowerCase().includes(term));
  }, [items, search]);

  const categoryGroups = useMemo(() => visibleItems.reduce((groups, item) => {
    const group = groups.find((entry) => entry.name === item.category);
    if (group) group.items.push(item);
    else groups.push({ name: item.category, items: [item] });
    return groups;
  }, []), [visibleItems]);

  function toggleTrade(code) {
    setSelectedTradeCodes((current) => {
      if (current.includes(code)) {
        const tradeName = trades.find((item) => item.code === code)?.name || 'this trade';
        if (!window.confirm(`Remove ${tradeName} from the quote? Its selected line items will also be removed.`)) return current;
        const next = current.filter((item) => item !== code);
        onTradeRemoved(code);
        if (activeTrade === code) setActiveTrade(next[0] || '');
        return next;
      }
      setActiveTrade(code);
      return [...current, code];
    });
  }

  return (
    <div className="trade-item-picker">
      <div className="quote-step-heading">
        <div><span>Step 1</span><h3>Select the trades for this quote</h3></div>
        <small>OUTsurance 2026 rate schedule</small>
      </div>
      <p className="field-help">The assessor selects every relevant trade. Only line items for those trades become available.</p>
      <div className="trade-groups">
        {tradeGroups.map((group) => (
          <div className="trade-group" key={group.name}>
            <strong>{group.name}</strong>
            <div className="trade-options">
              {group.trades.map((trade) => {
                const isSelected = selectedTradeCodes.includes(trade.code);
                return (
                  <button type="button" key={trade.code} className={isSelected ? 'trade-option selected' : 'trade-option'} onClick={() => toggleTrade(trade.code)} aria-pressed={isSelected}>
                    <span>{isSelected && <Check size={15} />}{trade.name}</span>
                    <small>{trade.item_count} items</small>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedTradeCodes.length > 0 && (
        <>
          <div className="quote-step-heading line-item-heading">
            <div><span>Step 2</span><h3>Add line items</h3></div>
          </div>
          <div className="trade-browse-tabs">
            {selectedTradeCodes.map((code) => {
              const trade = trades.find((item) => item.code === code);
              if (!trade) return null;
              return <button type="button" key={code} className={activeTrade === code ? 'active' : ''} onClick={() => setActiveTrade(code)}>{trade.name}</button>;
            })}
          </div>
          <label className="catalog-search">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this trade's line items" />
          </label>
          <div className="automatic-fee-note">Applicable startup fees are added automatically once per trade. They cannot be selected, duplicated, removed, or overridden.</div>
          <div className="item-list grouped-item-list">
            {categoryGroups.map((group) => (
              <div className="catalog-category" key={group.name}>
                <h4>{group.name}</h4>
                {group.items.map((item) => (
                  <button type="button" key={item.id} className="item-row" onClick={() => onAdd(item)}>
                    <span>{item.description}{item.pricing_note && <em className="pricing-note">{item.pricing_note}</em>}{item.automatic_startup_fee && <em>Startup fee applies automatically</em>}</span>
                    <small>{item.unit}</small>
                    <Plus size={17} />
                  </button>
                ))}
              </div>
            ))}
            {categoryGroups.length === 0 && <div className="empty">No matching line items.</div>}
          </div>
        </>
      )}
      {selectedTradeCodes.length === 0 && <div className="empty trade-empty">Select one or more trades to start adding line items.</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

function QuoteBuilder({ api, appointment, quoteId, onDone }) {
  const [selected, setSelected] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const [existingQuote, setExistingQuote] = useState(null);

  useEffect(() => {
    if (!quoteId) {
      setExistingQuote(null);
      setSelected([]);
      return;
    }
    api.quote(quoteId).then((quote) => {
      setExistingQuote(quote);
      setSelected(quote.items.filter((item) => !item.system_generated).map((item) => ({
        priceItemId: item.price_item_id,
        tradeCode: item.trade_code,
        tradeName: item.trade_name,
        category: item.category,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        enteredRate: item.input_amount ?? '',
        requiresRateInput: item.input_amount !== null
      })));
    });
  }, [api, quoteId]);
  function addItem(item) {
    setSelected((current) => current.some((line) => line.priceItemId === item.id)
      ? current
      : [...current, {
        priceItemId: item.id,
        tradeCode: item.trade_code,
        tradeName: item.trade_name,
        category: item.category,
        description: item.description,
        unit: item.unit,
        quantity: 1,
        enteredRate: '',
        requiresRateInput: item.requires_rate_input,
        pricingMode: item.pricing_mode,
        markupPercentage: item.markup_percentage
      }]);
  }

  function updateQty(id, quantity) {
    setSelected((current) => current.map((item) => item.priceItemId === id
      ? { ...item, quantity: quantity === '' ? '' : Number(quantity) }
      : item));
  }

  function removeItem(id) {
    setSelected((current) => current.filter((item) => item.priceItemId !== id));
  }

  function updateEnteredRate(id, enteredRate) {
    setSelected((current) => current.map((item) => item.priceItemId === id
      ? { ...item, enteredRate: enteredRate === '' ? '' : Number(enteredRate) }
      : item));
  }

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    try {
      setMessage(photos.length ? 'Optimizing photos for upload...' : '');
      const preparedPhotos = await preparePhotosForUpload(photos);
      const body = new FormData();
      body.append('payload', JSON.stringify({
        appointmentId: appointment?.id,
        items: selected.map((item) => ({
          priceItemId: item.priceItemId,
          quantity: Number(item.quantity),
          enteredRate: item.requiresRateInput ? Number(item.enteredRate) : null
        }))
      }));
      preparedPhotos.forEach((file) => body.append('photos', file));
      if (existingQuote) await api.updateQuote(existingQuote.id, body);
      else await api.submitQuote(body);
      setMessage(existingQuote ? 'Quote updated.' : 'Quote submitted to the quote administrator.');
      setTimeout(onDone, 600);
    } catch (err) {
      setMessage(err.message);
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
    <section className="workspace">
      <PageTitle title={existingQuote ? `Edit ${existingQuote.quote_number}` : "Quick Estimate"} subtitle="Pick scope items and quantities. Assessor pricing stays hidden." />
      <form className="quote-layout" onSubmit={submit}>
        <div className="panel">
          <div className="locked-details quote-context">
            <div><span>Client</span><strong>{appointment.client_name || appointment.customer_name}</strong></div>
            <div><span>Site address</span><strong>{appointment.site_address}</strong></div>
            <div><span>Request</span><strong>{appointment.request_details}</strong></div>
          </div>

          <TradeItemPicker
            api={api}
            onAdd={addItem}
            onTradeRemoved={(code) => setSelected((current) => current.filter((item) => item.tradeCode !== code))}
            initialTradeCodes={existingQuote?.items.filter((item) => !item.system_generated).map((item) => item.trade_code) || []}
          />
        </div>

        <div className="panel quote-summary">
          <h2>Selected Items</h2>
          {selected.length === 0 && <div className="empty">No line items selected yet.</div>}
          {selected.map((item) => (
            <div className="selected-line" key={item.priceItemId}>
              <div><strong>{item.description}</strong><span>{item.tradeName} · {item.unit}</span></div>
              <div className="selected-line-inputs">
                <label>Qty<input required type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateQty(item.priceItemId, e.target.value)} /></label>
                {item.requiresRateInput && (
                  <label>{item.pricingMode === 'manual' ? 'Calculated rate excl. VAT' : `Supplier cost excl. VAT${item.markupPercentage ? ` (+${item.markupPercentage}%)` : ''}`}
                    <input required type="number" min="0" step="0.01" value={item.enteredRate} onChange={(e) => updateEnteredRate(item.priceItemId, e.target.value)} />
                  </label>
                )}
              </div>
              <button type="button" className="secondary" onClick={() => removeItem(item.priceItemId)}>Remove</button>
            </div>
          ))}
          <label className="upload-box">
            <Camera size={22} />
            <span>{photos.length ? `${photos.length} photo(s) selected` : 'Upload site photos'}</span>
            <input type="file" multiple accept="image/*" onChange={(e) => setPhotos([...e.target.files])} />
          </label>
          {message && <div className={message.includes('submitted') || message.includes('updated') ? 'success' : 'error'}>{message}</div>}
          <button className="primary"><Send size={18} />{existingQuote ? "Save Quote" : "Submit Quote"}</button>
        </div>
      </form>
    </section>
  );
}
function CalendarView({ api, role, onStartQuote, onOpenQuote }) {
  const [assessors, setAssessors] = useState([]);
  const [assessorId, setAssessorId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const isAssessor = role === ROLES.ASSESSOR;
  const isAdmin = role === ROLES.ADMIN;
  const isScheduleAdministrator = role === ROLES.SCHEDULE_ADMINISTRATOR;
  const isQuoteAdministrator = role === ROLES.QUOTE_ADMINISTRATOR;
  const isManagement = role === ROLES.MANAGEMENT;
  const canFilterAssessors = isScheduleAdministrator || isManagement || isAdmin;
  const isQuoteTaskCalendar = isQuoteAdministrator || isManagement;
  const canStartQuote = isAssessor || isAdmin;
  const canManageAppointments = isScheduleAdministrator || isAdmin;

  useEffect(() => {
    if (!canFilterAssessors) return;
    api.assessors().then((rows) => {
      setAssessors(rows);
      setAssessorId('');
    });
  }, [api, canFilterAssessors]);

  useEffect(() => {
    api.appointments(assessorId).then(setAppointments);
  }, [api, assessorId]);

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = addDays(weekStart, 7);
  const weekAppointments = appointments.filter((appt) => {
    const date = new Date(appt.appointment_start);
    return date >= weekStart && date < weekEnd;
  });

  function appointmentsForDay(day) {
    return weekAppointments
      .filter((appt) => isSameDay(new Date(appt.appointment_start), day))
      .sort((a, b) => new Date(a.appointment_start) - new Date(b.appointment_start));
  }

  function handleEventClick(item) {
    if (item.calendar_type === 'quote_task') onOpenQuote?.(item.quote_id);
    else if (canManageAppointments) setEditingAppointment(item);
    else if (canStartQuote) onStartQuote?.(item);
  }

  async function appointmentChanged() {
    setEditingAppointment(null);
    setAppointments(await api.appointments(assessorId));
  }

  const subtitle = isQuoteTaskCalendar
    ? 'Outstanding submitted quotes awaiting ERP recapture.'
      : isScheduleAdministrator
      ? 'Weekly appointment view by assessor.'
      : canStartQuote
        ? 'Select an appointment to start the quick quote.'
        : 'Weekly appointment view.';

  return (
    <section className="workspace calendar-workspace">
      <PageTitle title="Calendar" subtitle={subtitle} />
      <div className="calendar-toolbar">
        {canFilterAssessors && (
          <select className="filter-select" value={assessorId} onChange={(e) => setAssessorId(e.target.value)}>
            <option value="">All assessors</option>
            {assessors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <div className="week-controls">
          <button className="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>Previous</button>
          <strong>{formatDateOnly(weekStart)} - {formatDateOnly(addDays(weekStart, 6))}</strong>
          <button className="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next</button>
        </div>
      </div>

      <div className="week-calendar">
        {days.map((day) => (
          <div className="calendar-day" key={day.toISOString()}>
            <div className="calendar-day-head">
              <strong>{day.toLocaleDateString(undefined, { weekday: 'short' })}</strong>
              <span>{day.getDate()}</span>
            </div>
            <div className="calendar-day-body">
              {appointmentsForDay(day).map((appt) => (
                <button type="button" className={appt.calendar_type === 'quote_task' ? 'calendar-event quote-task-event' : 'calendar-event'} key={`${appt.calendar_type}-${appt.id || appt.quote_id}`} onClick={() => handleEventClick(appt)}>
                  <span>
                    {formatTime(appt.appointment_start)}
                    {appt.appointment_end ? ` - ${formatTime(appt.appointment_end)}` : ''}
                  </span>
                  <strong>{appt.quote_number || appt.client_name || appt.customer_name}</strong>
                  <small>{appt.client_name || appt.customer_name}</small>
                  <small>{appt.site_address}</small>
                  {appt.assessor_name && <small>Assessor: {appt.assessor_name}</small>}
                  {isManagement && appt.quote_administrator_name && <small>Quote admin: {appt.quote_administrator_name}</small>}
                </button>
              ))}
              {appointmentsForDay(day).length === 0 && <div className="calendar-empty">{isQuoteTaskCalendar ? 'No outstanding quotes' : 'No appointments'}</div>}
            </div>
          </div>
        ))}
      </div>
      {editingAppointment && (
        <AppointmentEditorDialog
          api={api}
          appointment={editingAppointment}
          assessors={assessors}
          canStartQuote={isAdmin}
          onStartQuote={(appointment) => {
            setEditingAppointment(null);
            onStartQuote?.(appointment);
          }}
          onChanged={appointmentChanged}
          onClose={() => setEditingAppointment(null)}
        />
      )}
    </section>
  );
}

function AppointmentEditorDialog({ api, appointment, assessors, canStartQuote, onStartQuote, onChanged, onClose }) {
  const [form, setForm] = useState({
    assessorId: appointment.assessor_id,
    clientId: appointment.client_id,
    siteAddress: appointment.site_address,
    requestDetails: appointment.request_details,
    appointmentStart: appointment.appointment_start,
    appointmentEnd: appointment.appointment_end || ''
  });
  const [clientSearch, setClientSearch] = useState(appointment.client_name || appointment.customer_name || '');
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.clients(clientSearch).then(setClients).catch((err) => setError(err.message));
  }, [api, clientSearch]);

  function chooseClientName(value) {
    setClientSearch(value);
    const selected = clients.find((client) => client.name.toLowerCase() === value.trim().toLowerCase());
    setForm((current) => ({ ...current, clientId: selected?.id || '' }));
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    if (!form.clientId) {
      setError('Select a client from the suggestions.');
      return;
    }
    setSaving(true);
    try {
      await api.updateAppointment(appointment.id, form);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function cancelAppointment() {
    if (!window.confirm('Cancel and permanently remove this appointment? This cannot be undone.')) return;
    setSaving(true);
    setError('');
    try {
      await api.cancelAppointment(appointment.id);
      await onChanged();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit appointment</DialogTitle>
      <DialogContent>
        <form className="stack appointment-editor" onSubmit={save}>
          <label>Assessor
            <select value={form.assessorId} onChange={(event) => setForm({ ...form, assessorId: event.target.value })}>
              {assessors.map((assessor) => <option key={assessor.id} value={assessor.id}>{assessor.name}</option>)}
            </select>
          </label>
          <label>Client
            <input
              required
              list="appointment-client-options"
              value={clientSearch}
              onChange={(event) => chooseClientName(event.target.value)}
              placeholder="Search and select a client"
            />
            <datalist id="appointment-client-options">
              {clients.map((client) => <option key={client.id} value={client.name} />)}
            </datalist>
          </label>
          <label>Site address<input required value={form.siteAddress} onChange={(event) => setForm({ ...form, siteAddress: event.target.value })} /></label>
          <label>Request details<textarea required value={form.requestDetails} onChange={(event) => setForm({ ...form, requestDetails: event.target.value })} /></label>
          <div className="grid two">
            <DateTimePicker label="Start" value={form.appointmentStart} onChange={(value) => setForm({ ...form, appointmentStart: value })} required />
            <DateTimePicker label="End" value={form.appointmentEnd} onChange={(value) => setForm({ ...form, appointmentEnd: value })} />
          </div>
          {error && <div className="error">{error}</div>}
          <div className="appointment-editor-actions">
            <button className="primary" disabled={saving}><Check size={18} />Save changes</button>
            {canStartQuote && <button type="button" className="secondary" disabled={saving} onClick={() => onStartQuote(appointment)}>Start quote</button>}
            <button type="button" className="danger" disabled={saving} onClick={cancelAppointment}>Cancel appointment</button>
            <button type="button" className="secondary" disabled={saving} onClick={onClose}>Close</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleView({ api, onCreated }) {
  const [assessors, setAssessors] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClients, setShowClients] = useState(false);
  const [message, setMessage] = useState('');
  const clientFieldRef = useRef(null);
  const [form, setForm] = useState({ clientId: '', assessorId: '', siteAddress: '', requestDetails: '', appointmentStart: '', appointmentEnd: '' });

  useEffect(() => { api.assessors().then((rows) => { setAssessors(rows); setForm((f) => ({ ...f, assessorId: rows[0]?.id || '' })); }); }, [api]);
  useEffect(() => { api.clients(clientSearch).then(setClients); }, [api, clientSearch]);

    useEffect(() => {
    function closeClientDropdown(event) {
      if (clientFieldRef.current && !clientFieldRef.current.contains(event.target)) setShowClients(false);
    }
    document.addEventListener('mousedown', closeClientDropdown);
    return () => document.removeEventListener('mousedown', closeClientDropdown);
  }, []);

  function selectClient(client) {
    setClientSearch(client.name);
    setShowClients(false);
    setForm((current) => ({ ...current, clientId: client.id }));
  }

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    try {
      if (!form.appointmentStart) {
        setMessage('Please select a start date and time.');
        return;
      }
      await api.createAppointment(form);
      setMessage('Appointment scheduled.');
      setTimeout(onCreated, 500);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <section className="workspace narrow">
      <PageTitle title="Schedule Appointment" subtitle="Assign quotation requests to an assessor calendar." />
      <form className="panel stack" onSubmit={submit}>
        <label>Assessor<select value={form.assessorId} onChange={(e) => setForm({ ...form, assessorId: e.target.value })}>{assessors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="autocomplete-field" ref={clientFieldRef}>Client
          <input required value={clientSearch} onFocus={() => setShowClients(true)} onChange={(e) => { setClientSearch(e.target.value); setShowClients(true); setForm({ ...form, clientId: '' }); }} placeholder="Search and select a client" />
          {showClients && (
            <div className="autocomplete-list">
              {clients.map((client) => <button type="button" key={client.id} onMouseDown={() => selectClient(client)}>{client.name}</button>)}
              {clients.length === 0 && <span>No clients found</span>}
            </div>
          )}
        </label>
        <label>Site address<input required value={form.siteAddress} onChange={(e) => setForm({ ...form, siteAddress: e.target.value })} /></label>
        <label>Request details<textarea required value={form.requestDetails} onChange={(e) => setForm({ ...form, requestDetails: e.target.value })} /></label>
        <div className="grid two">
          <DateTimePicker label="Start" value={form.appointmentStart} onChange={(value) => setForm({ ...form, appointmentStart: value })} required />
          <DateTimePicker label="End" value={form.appointmentEnd} onChange={(value) => setForm({ ...form, appointmentEnd: value })} />
        </div>
        {message && <div className="success">{message}</div>}
        <button className="primary"><Check size={18} />Schedule</button>
      </form>
    </section>
  );
}

function AssignmentsView({ api }) {
  const [assessors, setAssessors] = useState([]);
  const [quoteAdministrators, setQuoteAdministrators] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.assessors(), api.quoteAdministrators()])
      .then(([assessorRows, administratorRows]) => {
        setAssessors(assessorRows);
        setQuoteAdministrators(administratorRows);
      })
      .catch((err) => setError(err.message));
  }, [api]);

  async function assign(assessor, value) {
    const quoteAdministratorId = value ? Number(value) : null;
    setSavingId(assessor.id);
    setMessage('');
    setError('');
    try {
      const updated = await api.assignQuoteAdministrator(assessor.id, quoteAdministratorId);
      setAssessors((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setMessage(`${updated.name} is now assigned to ${updated.quote_administrator_name || 'no Quote Administrator'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="workspace narrow">
      <PageTitle title="Assessor Assignments" subtitle="Route each Quote Assessor's submitted work to a Quote Administrator." />
      <div className="panel assignment-panel">
        <div className="assignment-header">
          <span>Quote Assessor</span>
          <span>Quote Administrator</span>
        </div>
        {assessors.map((assessor) => (
          <div className="assignment-row" key={assessor.id}>
            <div>
              <strong>{assessor.name}</strong>
              <small>{assessor.email}</small>
            </div>
            <label>
              <span className="sr-only">Quote Administrator for {assessor.name}</span>
              <select
                value={assessor.quote_administrator_id || ''}
                disabled={savingId === assessor.id}
                onChange={(event) => assign(assessor, event.target.value)}
              >
                <option value="">Unassigned</option>
                {quoteAdministrators.map((administrator) => (
                  <option key={administrator.id} value={administrator.id}>{administrator.name}</option>
                ))}
              </select>
            </label>
          </div>
        ))}
        {assessors.length === 0 && !error && <div className="empty">No Quote Assessors are available.</div>}
      </div>
      <p className="assignment-note">Changing an assignment affects newly submitted quotes only. Existing quotes remain with the Quote Administrator captured at submission.</p>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
    </section>
  );
}

function UsersView({ api }) {
  const emptyForm = { name: '', email: '', password: '', role: ROLES.ASSESSOR };
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.users().then(setUsers).catch((err) => setError(err.message));
  }, [api]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const created = await api.createUser(form);
      setUsers((rows) => [...rows, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(emptyForm);
      setMessage(`${created.name} was registered as ${ROLE_LABELS[created.role]}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace user-management-workspace">
      <PageTitle title="User Management" subtitle="Register users and control the role assigned to each account." />
      <div className="user-management-grid">
        <form className="panel stack" onSubmit={submit}>
          <h2>Register user</h2>
          <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Email address<input required type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Temporary password<input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <label>Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button className="primary" disabled={saving}><Plus size={18} />{saving ? 'Registering...' : 'Register user'}</button>
          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </form>

        <div className="panel user-list-panel">
          <h2>Registered users</h2>
          <div className="user-list">
            {users.map((user) => (
              <div className="user-list-row" key={user.id}>
                <div><strong>{user.name}</strong><small>{user.email}</small></div>
                <span className="role-badge">{ROLE_LABELS[user.role] || user.role}</span>
              </div>
            ))}
            {users.length === 0 && <div className="empty">No users are registered.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function DateTimePicker({ label, value, onChange, required = false }) {
  const initial = parseDateTimeValue(value);
  const pickerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(initial.date);
  const [draftTime, setDraftTime] = useState(initial.time);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(initial.date));
  const times = useMemo(() => buildTimeOptions(), []);
  const days = useMemo(() => buildPickerDays(viewMonth), [viewMonth]);

  useEffect(() => {
    function closePicker(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', closePicker);
    return () => document.removeEventListener('mousedown', closePicker);
  }, []);

  function openPicker() {
    const next = parseDateTimeValue(value);
    setDraftDate(next.date);
    setDraftTime(next.time);
    setViewMonth(startOfMonth(next.date));
    setOpen(true);
  }

  function chooseDate(day) {
    const nextDate = stripTime(day);
    setDraftDate(nextDate);
    onChange(formatDateTimeValue(nextDate, draftTime));
  }

  function chooseTime(time) {
    setDraftTime(time);
    onChange(formatDateTimeValue(draftDate, time));
    setOpen(false);
  }

  return (
    <div className="datetime-picker-field" ref={pickerRef}>
      <label>{label}{required && <span> *</span>}</label>
      <button type="button" className={value ? 'datetime-trigger has-value' : 'datetime-trigger'} onClick={openPicker}>
        <CalendarDays size={16} />
        <span>{value ? formatDateTimeDisplay(value) : `Select ${label.toLowerCase()}`}</span>
      </button>
      {open && (
        <div className="datetime-popover">
          <div className="datetime-calendar">
            <div className="datetime-month-nav">
              <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, -1))} aria-label="Previous month">&lsaquo;</button>
              <strong>{viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
              <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} aria-label="Next month">&rsaquo;</button>
            </div>
            <div className="datetime-weekdays">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="datetime-days">
              {days.map((day) => (
                <button
                  type="button"
                  key={day.toISOString()}
                  className={[
                    sameMonth(day, viewMonth) ? '' : 'muted',
                    isSameDay(day, new Date()) ? 'today' : '',
                    isSameDay(day, draftDate) ? 'selected' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => chooseDate(day)}
                >
                  {day.getDate()}
                </button>
              ))}
            </div>
          </div>
          <div className="datetime-times">
            <strong>Available times</strong>
            <div className="datetime-time-list">
              {times.map((time) => (
                <button type="button" className={time.value === draftTime ? 'selected' : ''} key={time.value} onClick={() => chooseTime(time.value)}>
                  {time.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function QuotesView({ api, role, initialQuoteId, onOpenedInitialQuote }) {
  const [quotes, setQuotes] = useState([]);
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState('');
  const [assessors, setAssessors] = useState([]);
  const [assessorId, setAssessorId] = useState('all');
  const [editing, setEditing] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(null);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [erpQuoteNumber, setErpQuoteNumber] = useState('');
  const [photoArchiveUrl, setPhotoArchiveUrl] = useState('');
  const [archiveVerified, setArchiveVerified] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState('submitted');

  const isAdmin = role === ROLES.ADMIN;
  const isAssessor = role === ROLES.ASSESSOR;
  const isQuoteAdministrator = role === ROLES.QUOTE_ADMINISTRATOR || isAdmin;
  const isManagement = role === ROLES.MANAGEMENT || isAdmin;
  const canEditQuote = isAssessor || isAdmin;
  const canReviewQuotes = isQuoteAdministrator || isManagement;

  useEffect(() => {
    if (canReviewQuotes) api.assessors().then(setAssessors);
  }, [api, canReviewQuotes]);

  useEffect(() => {
    api.quotes(assessorId, quoteStatus).then((rows) => {
      setQuotes(rows);
      if (active && !rows.some((quote) => quote.id === active.id)) setActive(null);
    });
  }, [api, assessorId, quoteStatus]);

  useEffect(() => {
    if (!initialQuoteId) return;
    openQuote(initialQuoteId).then(() => onOpenedInitialQuote?.());
  }, [initialQuoteId]);

  const filtered = quotes.filter((q) => `${q.quote_number} ${q.customer_name} ${q.site_address} ${q.assessor_name} ${q.quote_administrator_name || ''} ${q.erp_quote_number || ''}`.toLowerCase().includes(query.toLowerCase()));

  const adminRows = filtered.map((quote) => ({
    ...quote,
    quote_label: quote.quote_number || `Quote #${quote.id}`,
    submitted_label: formatDate(quote.created_at),
    subtotal_label: `R ${Number(quote.subtotal || 0).toFixed(2)}`
  }));

  const adminColumns = [
    { field: 'quote_label', headerName: 'Quote', minWidth: 130, flex: 0.7 },
    { field: 'customer_name', headerName: 'Client', minWidth: 220, flex: 1.3 },
    { field: 'site_address', headerName: 'Site Address', minWidth: 260, flex: 1.5 },
    { field: 'assessor_name', headerName: 'Assessor', minWidth: 170, flex: 1 },
    ...(isManagement ? [{ field: 'quote_administrator_name', headerName: 'Quote Admin', minWidth: 180, flex: 1 }] : []),
    { field: 'submitted_label', headerName: 'Submitted', minWidth: 150, flex: 0.8 },
    { field: 'photo_count', headerName: 'Photos', minWidth: 95, flex: 0.45, type: 'number' },
    { field: 'status', headerName: 'Status', minWidth: 110, flex: 0.55 },
    { field: 'subtotal_label', headerName: 'Reference Value', minWidth: 145, flex: 0.7 }
  ];

  async function refreshQuote(id = active?.id) {
    const rows = await api.quotes(assessorId, quoteStatus);
    setQuotes(rows);
    if (id && rows.some((quote) => quote.id === id)) {
      const next = await api.quote(id);
      setActive(next);
      setErpQuoteNumber(next.erp_quote_number || '');
      setPhotoArchiveUrl(next.photo_archive_url || '');
    } else {
      setActive(null);
    }
  }

  async function downloadPhotos() {
    if (!active) return;
    setDownloadMessage('');
    try {
      await api.downloadQuotePhotos(active.id, active.quote_number);
    } catch (err) {
      setDownloadMessage(err.message);
    }
  }

  async function completeActiveQuote() {
    if (!active) return;
    setDownloadMessage('');
    try {
      await api.completeQuote(active.id, erpQuoteNumber, photoArchiveUrl, archiveVerified);
      const completed = await api.quote(active.id);
      setQuoteStatus('completed');
      setActive(completed);
      setQuotes((current) => current.filter((quote) => quote.id !== active.id));
    } catch (err) {
      setDownloadMessage(err.message);
    }
  }

  async function openQuote(id) {
    setEditing(false);
    setPhotoIndex(null);
    setDownloadMessage('');
    const quote = await api.quote(id);
    setActive(quote);
    setErpQuoteNumber(quote.erp_quote_number || '');
    setPhotoArchiveUrl(quote.photo_archive_url || '');
    setArchiveVerified(false);
  }

  function closeQuote() {
    setActive(null);
    setEditing(false);
    setPhotoIndex(null);
    setDownloadMessage('');
    setErpQuoteNumber('');
    setPhotoArchiveUrl('');
    setArchiveVerified(false);
  }

  function renderQuoteDetail({ fullScreen = false } = {}) {
    return (
      <div className={fullScreen ? 'panel detail-panel quote-detail-screen' : 'panel detail-panel'}>
        {!active && <div className="empty">Select a quote to view details.</div>}
        {active && editing && canEditQuote && (
          <QuoteEditor api={api} quote={active} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await refreshQuote(active.id); }} />
        )}
        {active && !editing && (
          <>
            {fullScreen && <button type="button" className="secondary back-button" onClick={closeQuote}><ArrowLeft size={18} />Back to quotes</button>}
            <div className="detail-heading">
              <div>
                <h2>{active.quote_number || `Quote #${active.id}`}</h2>
                <p className="muted">{active.customer_name}</p>
                <p className="muted">{active.site_address}</p>
                <p className="muted">Assessor: {active.assessor_name}</p>
                {active.quote_administrator_name && <p className="muted">Quote admin: {active.quote_administrator_name}</p>}
                <p className="muted">Status: {active.status === 'completed' ? 'Completed' : 'Outstanding'}</p>
                {active.erp_quote_number && <p className="muted">ERP quote: {active.erp_quote_number}</p>}
              </div>
              <div className="detail-actions">
                {isQuoteAdministrator && active.status === 'submitted' && active.photos.length > 0 && <button className="primary" onClick={downloadPhotos}><Download size={18} />Download photos</button>}
                {canEditQuote && active.status === 'submitted' && <button className="secondary" onClick={() => setEditing(true)}>Edit quote</button>}
              </div>
            </div>
            <div className="line-table">
              {active.items.map((item) => (
                <div key={item.id}><span>{item.description}{item.system_generated && <em className="system-fee-badge">Automatic 2026 fee</em>}</span><span>{item.quantity} {item.unit}</span>{canReviewQuotes && <strong>R {item.line_total.toFixed(2)}</strong>}</div>
              ))}
            </div>
            {canReviewQuotes && <h3>Reference total: R {active.subtotal.toFixed(2)}</h3>}
            {isQuoteAdministrator && active.status === 'submitted' && (
              <div className="erp-complete-panel">
                <label>ERP Quote Number<input required value={erpQuoteNumber} onChange={(e) => setErpQuoteNumber(e.target.value)} placeholder="Enter ERP quote number" /></label>
                <label>OneDrive Photo Folder URL<input required type="url" value={photoArchiveUrl} onChange={(e) => setPhotoArchiveUrl(e.target.value)} placeholder="Paste the OneDrive or SharePoint folder link" /></label>
                <label className="archive-confirmation">
                  <input type="checkbox" checked={archiveVerified} onChange={(e) => setArchiveVerified(e.target.checked)} />
                  <span>I verified that every quote photo is present in this archive folder.</span>
                </label>
                <button
                  className="primary"
                  type="button"
                  disabled={!erpQuoteNumber.trim() || !photoArchiveUrl.trim() || !archiveVerified}
                  onClick={completeActiveQuote}
                >
                  <Check size={18} />Mark as complete
                </button>
              </div>
            )}
            {active.status === 'completed' && (
              <div className="photo-archive-panel">
                <div>
                  <strong>Archived quote photos</strong>
                  <span>
                    {active.photos_purged_at
                      ? `${active.archived_photo_count || 0} photo(s) were removed from the VPS after completion.`
                      : active.photo_purge_eligible_at
                        ? `Local photos are retained until ${formatDate(active.photo_purge_eligible_at)}, then purged automatically.`
                        : 'The archive link is saved and local photo cleanup is pending.'}
                  </span>
                </div>
                {active.photo_archive_url
                  ? <a className="primary archive-link" href={active.photo_archive_url} target="_blank" rel="noopener noreferrer">Open photos in OneDrive</a>
                  : <span className="error">No OneDrive archive link was recorded.</span>}
              </div>
            )}
            {downloadMessage && <div className="error">{downloadMessage}</div>}
            <div className="photo-grid">
              {active.photos.map((photo, index) => (
                <button type="button" key={photo.id} onClick={() => setPhotoIndex(index)}>
                  <ProtectedPhoto api={api} path={photo.url} alt={photo.original_name} thumbnail />
                </button>
              ))}
            </div>
            {photoIndex !== null && active.photos[photoIndex] && (
              <PhotoViewer
                photos={active.photos}
                api={api}
                index={photoIndex}
                onChange={setPhotoIndex}
                onClose={() => setPhotoIndex(null)}
              />
            )}
          </>
        )}
      </div>
    );
  }

  if (canReviewQuotes && active) {
    return (
      <section className="workspace quote-detail-workspace">
        <PageTitle title="Quote Detail" subtitle="Review the assessor quote packet before recapturing it in ERP." />
        {renderQuoteDetail({ fullScreen: true })}
      </section>
    );
  }

  const showingCompleted = quoteStatus === 'completed';
  const title = showingCompleted
    ? 'Completed Quotes'
    : isAssessor ? 'My Quotes' : isManagement ? 'Outstanding Quote Work' : 'My Outstanding Quotes';
  const subtitle = showingCompleted
    ? 'Open a completed quote to view its ERP number and OneDrive photo archive.'
    : isAssessor ? 'Track and edit submitted quotes until the quote administrator completes them.' : 'Open a submitted quote to review the full packet.';

  return (
    <section className="workspace">
      <PageTitle title={title} subtitle={subtitle} />

      <div className="quote-tools">
        <select className="filter-select" value={quoteStatus} onChange={(e) => { setQuoteStatus(e.target.value); setActive(null); }}>
          <option value="submitted">Outstanding quotes</option>
          <option value="completed">Completed quotes</option>
        </select>
        {canReviewQuotes && (
          <select className="filter-select" value={assessorId} onChange={(e) => setAssessorId(e.target.value)}>
            <option value="all">All assessors</option>
            {assessors.map((assessor) => <option key={assessor.id} value={assessor.id}>{assessor.name}</option>)}
          </select>
        )}
        <div className="searchbar"><Search size={18} /><input placeholder="Search quotes" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>

      {canReviewQuotes ? (
        <div className="panel admin-quotes-table">
          <DataGrid
            rows={adminRows}
            columns={adminColumns}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            onRowClick={(params) => openQuote(params.id)}
            sx={{
              border: 0,
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' }
            }}
          />
        </div>
      ) : (
        <div className="quote-browser">
          <div className="quote-list">
            {filtered.map((quote) => (
              <button key={quote.id} className="quote-card" onClick={() => openQuote(quote.id)}>
                <strong>{quote.quote_number || `Quote #${quote.id}`}</strong>
                <span>{quote.customer_name}</span>
                <span>{quote.site_address}</span>
                <small>{quote.assessor_name} | {formatDate(quote.created_at)} | {quote.photo_count} photos</small>
              </button>
            ))}
            {filtered.length === 0 && <div className="empty">No quotes found for this view.</div>}
          </div>
          {renderQuoteDetail()}
        </div>
      )}
    </section>
  );
}
function ProtectedPhoto({ api, path, alt, thumbnail = false, eager = false }) {
  const imageRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (eager || shouldLoad) return undefined;
    const element = imageRef.current;
    if (!element || !('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [eager, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return undefined;
    let disposed = false;
    let objectUrl = '';
    const separator = path.includes('?') ? '&' : '?';
    api.loadPhoto(thumbnail ? `${path}${separator}thumbnail=true` : path)
      .then((url) => {
        objectUrl = url;
        if (disposed) URL.revokeObjectURL(url);
        else setSrc(url);
      })
      .catch(() => {
        if (!disposed) setSrc('');
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [api, path, shouldLoad, thumbnail]);

  return <img ref={imageRef} src={src || undefined} alt={src ? alt : `Loading ${alt}`} loading={eager ? 'eager' : 'lazy'} />;
}

function PhotoViewer({ photos, api, index, onChange, onClose }) {
  const photo = photos[index];
  const canGoBack = index > 0;
  const canGoForward = index < photos.length - 1;

  function previous() {
    if (canGoBack) onChange(index - 1);
  }

  function next() {
    if (canGoForward) onChange(index + 1);
  }

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth className="photo-slider-dialog">
      <DialogTitle className="photo-slider-title">
        <Typography variant="subtitle1" component="span">{photo.original_name}</Typography>
        <IconButton onClick={onClose} aria-label="Close photo viewer"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box className="photo-slider-main">
          <IconButton className="photo-slider-arrow" onClick={previous} disabled={!canGoBack} aria-label="Previous photo">
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
          <Box className="photo-slider-image-wrap">
            <ProtectedPhoto key={photo.id} api={api} path={photo.url} alt={photo.original_name} eager />
          </Box>
          <IconButton className="photo-slider-arrow" onClick={next} disabled={!canGoForward} aria-label="Next photo">
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        </Box>
        <Box className="photo-slider-strip">
          {photos.map((item, itemIndex) => (
            <button type="button" className={itemIndex === index ? 'active' : ''} key={item.id} onClick={() => onChange(itemIndex)}>
              <ProtectedPhoto api={api} path={item.url} alt={item.original_name} thumbnail />
            </button>
          ))}
        </Box>
        <Box className="photo-slider-footer">
          <Typography variant="body2">{index + 1} of {photos.length}</Typography>
          <MuiButton variant="outlined" onClick={onClose}>Close</MuiButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function QuoteEditor({ api, quote, onCancel, onSaved }) {
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(() => quote.items.filter((item) => !item.system_generated).map((item) => ({
    priceItemId: item.price_item_id,
    tradeCode: item.trade_code,
    tradeName: item.trade_name,
    category: item.category,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    enteredRate: item.input_amount ?? '',
    requiresRateInput: item.input_amount !== null
  })));

  function addItem(item) {
    setSelected((current) => current.some((line) => line.priceItemId === item.id)
      ? current
      : [...current, {
        priceItemId: item.id,
        tradeCode: item.trade_code,
        tradeName: item.trade_name,
        category: item.category,
        description: item.description,
        unit: item.unit,
        quantity: 1,
        enteredRate: '',
        requiresRateInput: item.requires_rate_input,
        pricingMode: item.pricing_mode,
        markupPercentage: item.markup_percentage
      }]);
  }

  function updateQty(id, quantity) {
    setSelected((current) => current.map((item) => item.priceItemId === id
      ? { ...item, quantity: quantity === '' ? '' : Number(quantity) }
      : item));
  }

  function removeItem(id) {
    setSelected((current) => current.filter((item) => item.priceItemId !== id));
  }

  function updateEnteredRate(id, enteredRate) {
    setSelected((current) => current.map((item) => item.priceItemId === id
      ? { ...item, enteredRate: enteredRate === '' ? '' : Number(enteredRate) }
      : item));
  }

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    try {
      setMessage(photos.length ? 'Optimizing photos for upload...' : '');
      const preparedPhotos = await preparePhotosForUpload(photos);
      const body = new FormData();
      body.append('payload', JSON.stringify({
        appointmentId: quote.appointment_id,
        items: selected.map((item) => ({
          priceItemId: item.priceItemId,
          quantity: Number(item.quantity),
          enteredRate: item.requiresRateInput ? Number(item.enteredRate) : null
        }))
      }));
      preparedPhotos.forEach((file) => body.append('photos', file));
      await api.updateQuote(quote.id, body);
      await onSaved();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="detail-heading">
        <h2>Edit Quote</h2>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
      <div className="locked-details">
        <div><span>Client</span><strong>{quote.customer_name}</strong></div>
        <div><span>Site address</span><strong>{quote.site_address}</strong></div>
        <div><span>Request</span><strong>{quote.request_details || 'No request notes captured'}</strong></div>
      </div>

      <TradeItemPicker
        api={api}
        onAdd={addItem}
        onTradeRemoved={(code) => setSelected((current) => current.filter((item) => item.tradeCode !== code))}
        initialTradeCodes={quote.items.filter((item) => !item.system_generated).map((item) => item.trade_code)}
      />

      <h3>Selected Items</h3>
      {selected.map((item) => (
        <div className="selected-line" key={item.priceItemId}>
          <div><strong>{item.description}</strong><span>{item.tradeName} · {item.unit}</span></div>
          <div className="selected-line-inputs">
            <label>Qty<input required type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateQty(item.priceItemId, e.target.value)} /></label>
            {item.requiresRateInput && (
              <label>Entered cost/rate excl. VAT<input required type="number" min="0" step="0.01" value={item.enteredRate} onChange={(e) => updateEnteredRate(item.priceItemId, e.target.value)} /></label>
            )}
          </div>
          <button type="button" className="secondary" onClick={() => removeItem(item.priceItemId)}>Remove</button>
        </div>
      ))}
      <label className="upload-box">
        <Camera size={22} />
        <span>{photos.length ? `${photos.length} new photo(s) selected` : 'Add more site photos'}</span>
        <input type="file" multiple accept="image/*" onChange={(e) => setPhotos([...e.target.files])} />
      </label>
      {message && <div className="error">{message}</div>}
      <button className="primary"><Check size={18} />Save changes</button>
    </form>
  );
}

async function preparePhotosForUpload(files) {
  const prepared = [];
  for (const file of files) {
    prepared.push(await optimizePhoto(file));
  }
  const totalBytes = prepared.reduce((total, file) => total + file.size, 0);
  if (totalBytes > 75 * 1024 * 1024) {
    throw new Error('The optimized photos exceed the 75 MB limit for one submission.');
  }
  return prepared;
}

async function optimizePhoto(file) {
  const compressibleTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!compressibleTypes.has(file.type) || typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    });
  } catch {
    return file;
  }
}

function PageTitle({ title, subtitle }) {
  return <header className="page-title"><h1>{title}</h1><p>{subtitle}</p></header>;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatDateOnly(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function startOfWeek(value) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}


function parseDateTimeValue(value) {
  if (!value) {
    const now = new Date();
    const roundedMinutes = now.getMinutes() <= 30 ? 30 : 60;
    now.setMinutes(roundedMinutes, 0, 0);
    return { date: stripTime(now), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` };
  }
  const date = new Date(value);
  return {
    date: stripTime(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  };
}

function formatDateTimeValue(date, time) {
  return `${dateInputValue(date)}T${time}`;
}

function formatDateTimeDisplay(value) {
  const date = new Date(value);
  const day = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

function buildTimeOptions() {
  const options = [];
  for (let hour = 8; hour <= 17; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 17 && minute === 30) continue;
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const label = new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      options.push({ value, label });
    }
  }
  return options;
}

function buildPickerDays(monthDate) {
  const first = startOfMonth(monthDate);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function startOfMonth(value) {
  const date = new Date(value);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addMonths(value, months) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return startOfMonth(date);
}

function sameMonth(left, right) {
  return left.getMonth() === right.getMonth() && left.getFullYear() === right.getFullYear();
}
function dateInputValue(value) {
  const date = stripTime(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


function stripTime(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The application still works if service workers are unavailable.
    });
  });
}





















































