import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  Camera,
  Check,
  ClipboardList,
  Clock,
  FileText,
  LogOut,
  MapPin,
  Plus,
  Search,
  Send,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('mrs-session') || 'null'));
  const [view, setView] = useState('quote');

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

  const isAdmin = session.user.role === 'administrator';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={28} />
          <div>
            <strong>MRS Quotes</strong>
            <span>{isAdmin ? 'Quote Administrator' : 'Quote Assessor'}</span>
          </div>
        </div>

        <nav>
          {!isAdmin && <NavButton icon={<FileText />} label="Quick Quote" active={view === 'quote'} onClick={() => setView('quote')} />}
          <NavButton icon={<CalendarDays />} label="Calendar" active={view === 'calendar'} onClick={() => setView('calendar')} />
          <NavButton icon={<ClipboardList />} label={isAdmin ? 'Submitted Quotes' : 'My Quotes'} active={view === 'quotes'} onClick={() => setView('quotes')} />
          {isAdmin && <NavButton icon={<Plus />} label="Schedule" active={view === 'schedule'} onClick={() => setView('schedule')} />}
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
        {!isAdmin && view === 'quote' && <QuoteBuilder api={api} />}
        {view === 'calendar' && <CalendarView api={api} isAdmin={isAdmin} />}
        {view === 'quotes' && <QuotesView api={api} isAdmin={isAdmin} />}
        {isAdmin && view === 'schedule' && <ScheduleView api={api} onCreated={() => setView('calendar')} />}
      </main>
    </div>
  );
}

function createApi(token) {
  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  return {
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    sections: () => request('/price-sections'),
    prices: (group) => request(`/price-items${group ? `?group=${encodeURIComponent(group)}` : ''}`),
    appointments: (assessorId) => request(`/appointments${assessorId ? `?assessorId=${assessorId}` : ''}`),
    assessors: () => request('/users/assessors'),
    clients: (search = '') => request(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    createAppointment: (body) => request('/appointments', { method: 'POST', body: JSON.stringify(body) }),
    quotes: (assessorId) => request(`/quotes${assessorId && assessorId !== 'all' ? `?assessorId=${assessorId}` : ''}`),
    quote: (id) => request(`/quotes/${id}`),
    submitQuote: (form) => request('/quotes', { method: 'POST', body: form }),
    updateQuote: (id, form) => request(`/quotes/${id}`, { method: 'PUT', body: form }),
  };
}

function Login({ onLogin }) {
  const api = useMemo(() => createApi(), []);
  const [email, setEmail] = useState('assessor@mrs.local');
  const [password, setPassword] = useState('assessor123');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      onLogin(await api.login(email, password));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="login-mark"><ShieldCheck size={34} /></div>
        <h1>MRS Quotes</h1>
        <p>Sign in to create on-site estimates, upload photos, and manage quote appointments.</p>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary">Sign in</button>
        <div className="demo-logins">
          <button type="button" onClick={() => { setEmail('assessor@mrs.local'); setPassword('assessor123'); }}>Assessor demo</button>
          <button type="button" onClick={() => { setEmail('admin@mrs.local'); setPassword('admin123'); }}>Admin demo</button>
        </div>
      </form>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return <button className={active ? 'nav active' : 'nav'} onClick={onClick}>{React.cloneElement(icon, { size: 19 })}<span>{label}</span></button>;
}

function QuoteBuilder({ api }) {
  const [sections, setSections] = useState([]);
  const [section, setSection] = useState('');
  const [items, setItems] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ customerName: '', siteAddress: '', requestDetails: '', appointmentId: '' });

  useEffect(() => { api.sections().then((data) => { setSections(data); setSection(data[0]?.section || ''); }); }, [api]);
  useEffect(() => { api.appointments().then(setAppointments); }, [api]);
  useEffect(() => { if (section) api.prices(section).then(setItems); }, [api, section]);

  function chooseAppointment(appointmentId) {
    const appointment = appointments.find((item) => String(item.id) === String(appointmentId));
    if (!appointment) {
      setForm({ customerName: '', siteAddress: '', requestDetails: '', appointmentId: '' });
      return;
    }
    setForm({
      appointmentId: appointment.id,
      customerName: appointment.client_name || appointment.customer_name,
      siteAddress: appointment.site_address,
      requestDetails: appointment.request_details
    });
  }

  function addItem(item) {
    setSelected((current) => current.some((line) => line.priceItemId === item.id)
      ? current
      : [...current, { priceItemId: item.id, description: item.description, unit: item.unit, quantity: 1 }]);
  }

  function updateQty(id, quantity) {
    setSelected((current) => current.map((item) => item.priceItemId === id ? { ...item, quantity } : item));
  }

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    const body = new FormData();
    body.append('payload', JSON.stringify({ ...form, items: selected }));
    photos.forEach((file) => body.append('photos', file));
    try {
      await api.submitQuote(body);
      setMessage('Quote submitted to the administrator.');
      setSelected([]);
      setPhotos([]);
      setForm({ customerName: '', siteAddress: '', requestDetails: '', appointmentId: '' });
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <section className="workspace">
      <PageTitle title="Quick Estimate" subtitle="Pick scope items and quantities. Assessor pricing stays hidden." />
      <form className="quote-layout" onSubmit={submit}>
        <div className="panel">
          <label>Scheduled appointment<select required value={form.appointmentId} onChange={(e) => chooseAppointment(e.target.value)}>
            <option value="">No appointment selected</option>
            {appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.customer_name} | {formatDate(appointment.appointment_start)}</option>)}
          </select></label>
          <div className="grid two">
            <label>Client<input required readOnly value={form.customerName} /></label>
            <label>Site address<input required readOnly value={form.siteAddress} /></label>
          </div>
          <label>Quotation request<textarea readOnly value={form.requestDetails} /></label>

          <div className="section-tabs">
            {sections.map((s) => <button type="button" className={s.section === section ? 'chip active' : 'chip'} key={s.section} onClick={() => setSection(s.section)}>{s.section}</button>)}
          </div>

          <div className="item-list">
            {items.map((item) => (
              <button type="button" key={item.id} className="item-row" onClick={() => addItem(item)}>
                <span>{item.description}</span>
                <small>{item.category} · {item.unit}</small>
                <Plus size={17} />
              </button>
            ))}
          </div>
        </div>

        <div className="panel quote-summary">
          <h2>Selected Items</h2>
          {selected.length === 0 && <div className="empty">No line items selected yet.</div>}
          {selected.map((item) => (
            <div className="selected-line" key={item.priceItemId}>
              <div><strong>{item.description}</strong><span>{item.unit}</span></div>
              <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateQty(item.priceItemId, e.target.value)} />
            </div>
          ))}
          <label className="upload-box">
            <Camera size={22} />
            <span>{photos.length ? `${photos.length} photo(s) selected` : 'Upload site photos'}</span>
            <input type="file" multiple accept="image/*" onChange={(e) => setPhotos([...e.target.files])} />
          </label>
          {message && <div className={message.includes('submitted') ? 'success' : 'error'}>{message}</div>}
          <button className="primary"><Send size={18} />Submit Quote</button>
        </div>
      </form>
    </section>
  );
}

function CalendarView({ api, isAdmin }) {
  const [assessors, setAssessors] = useState([]);
  const [assessorId, setAssessorId] = useState('');
  const [appointments, setAppointments] = useState([]);

  useEffect(() => { if (isAdmin) api.assessors().then((rows) => { setAssessors(rows); setAssessorId(String(rows[0]?.id || '')); }); }, [api, isAdmin]);
  useEffect(() => { api.appointments(assessorId).then(setAppointments); }, [api, assessorId]);

  return (
    <section className="workspace">
      <PageTitle title="Calendar" subtitle="Scheduled quotation appointments by assessor." />
      {isAdmin && <select className="filter-select" value={assessorId} onChange={(e) => setAssessorId(e.target.value)}>{assessors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
      <div className="timeline">
        {appointments.map((appt) => (
          <article className="appointment" key={appt.id}>
            <div className="date-badge"><Clock size={17} />{formatDate(appt.appointment_start)}</div>
            <h3>{appt.customer_name}</h3>
            <p><MapPin size={16} />{appt.site_address}</p>
            <p>{appt.request_details}</p>
            <span className="status">{appt.status}</span>
          </article>
        ))}
        {appointments.length === 0 && <div className="empty">No appointments scheduled.</div>}
      </div>
    </section>
  );
}

function ScheduleView({ api, onCreated }) {
  const [assessors, setAssessors] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ clientId: '', assessorId: '', siteAddress: '', requestDetails: '', appointmentStart: '', appointmentEnd: '' });

  useEffect(() => { api.assessors().then((rows) => { setAssessors(rows); setForm((f) => ({ ...f, assessorId: rows[0]?.id || '' })); }); }, [api]);
  useEffect(() => { api.clients(clientSearch).then(setClients); }, [api, clientSearch]);

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    try {
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
        <label>Client search<input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Search client name" /></label>
        <label>Client<select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          <option value="">Select a client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select></label>
        <label>Site address<input required value={form.siteAddress} onChange={(e) => setForm({ ...form, siteAddress: e.target.value })} /></label>
        <label>Request details<textarea required value={form.requestDetails} onChange={(e) => setForm({ ...form, requestDetails: e.target.value })} /></label>
        <div className="grid two">
          <label>Start<input required type="datetime-local" value={form.appointmentStart} onChange={(e) => setForm({ ...form, appointmentStart: e.target.value })} /></label>
          <label>End<input type="datetime-local" value={form.appointmentEnd} onChange={(e) => setForm({ ...form, appointmentEnd: e.target.value })} /></label>
        </div>
        {message && <div className="success">{message}</div>}
        <button className="primary"><Check size={18} />Schedule</button>
      </form>
    </section>
  );
}
function QuotesView({ api, isAdmin }) {
  const [quotes, setQuotes] = useState([]);
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState('');
  const [assessors, setAssessors] = useState([]);
  const [assessorId, setAssessorId] = useState('all');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (isAdmin) api.assessors().then(setAssessors);
  }, [api, isAdmin]);

  useEffect(() => {
    api.quotes(assessorId).then((rows) => {
      setQuotes(rows);
      if (active && !rows.some((quote) => quote.id === active.id)) setActive(null);
    });
  }, [api, assessorId]);

  const filtered = quotes.filter((q) => `${q.quote_number} ${q.customer_name} ${q.site_address} ${q.assessor_name}`.toLowerCase().includes(query.toLowerCase()));
  const totalValue = filtered.reduce((sum, quote) => sum + Number(quote.subtotal || 0), 0);
  const withPhotos = filtered.filter((quote) => Number(quote.photo_count || 0) > 0).length;

  async function refreshQuote(id = active?.id) {
    const rows = await api.quotes(assessorId);
    setQuotes(rows);
    if (id) setActive(await api.quote(id));
  }

  async function openQuote(id) {
    setEditing(false);
    setActive(await api.quote(id));
  }

  return (
    <section className="workspace">
      <PageTitle title={isAdmin ? 'Submitted Quotes' : 'My Quotes'} subtitle={isAdmin ? 'Track every assessor quote packet before redoing it in ERP.' : 'Track and edit all quotes you have submitted.'} />

      <div className="quote-tools">
        {isAdmin && (
          <select className="filter-select" value={assessorId} onChange={(e) => setAssessorId(e.target.value)}>
            <option value="all">All assessors</option>
            {assessors.map((assessor) => <option key={assessor.id} value={assessor.id}>{assessor.name}</option>)}
          </select>
        )}
        <div className="searchbar"><Search size={18} /><input placeholder="Search quotes" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>

      <div className="metric-row">
        <div className="metric"><span>Total quotes</span><strong>{filtered.length}</strong></div>
        <div className="metric"><span>With photos</span><strong>{withPhotos}</strong></div>
        <div className="metric"><span>Assessors shown</span><strong>{isAdmin && assessorId === 'all' ? assessors.length : 1}</strong></div>
        {isAdmin && <div className="metric"><span>Reference value</span><strong>R {totalValue.toFixed(2)}</strong></div>}
      </div>

      <div className="quote-browser">
        <div className="quote-list">
          {filtered.map((quote) => (
            <button key={quote.id} className="quote-card" onClick={() => openQuote(quote.id)}>
              <strong>{quote.quote_number || `Quote #${quote.id}`}</strong>
              <span>{quote.customer_name}</span>
              <span>{quote.site_address}</span>
              <small>{quote.assessor_name} | {formatDate(quote.created_at)} | {quote.photo_count} photos</small>
              {isAdmin && <b>R {Number(quote.subtotal).toFixed(2)}</b>}
            </button>
          ))}
          {filtered.length === 0 && <div className="empty">No quotes found for this view.</div>}
        </div>
        <div className="panel detail-panel">
          {!active && <div className="empty">Select a quote to view details.</div>}
          {active && editing && !isAdmin && (
            <QuoteEditor api={api} quote={active} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await refreshQuote(active.id); }} />
          )}
          {active && !editing && (
            <>
              <div className="detail-heading">
                <div>
                  <h2>{active.quote_number || `Quote #${active.id}`}</h2>
                  <p className="muted">{active.customer_name}</p>
                  <p className="muted">{active.site_address}</p>
                  <p className="muted">Assessor: {active.assessor_name}</p>
                </div>
                {!isAdmin && <button className="secondary" onClick={() => setEditing(true)}>Edit quote</button>}
              </div>
              <div className="line-table">
                {active.items.map((item) => (
                  <div key={item.id}><span>{item.description}</span><span>{item.quantity} {item.unit}</span>{isAdmin && <strong>R {item.line_total.toFixed(2)}</strong>}</div>
                ))}
              </div>
              {isAdmin && <h3>Reference total: R {active.subtotal.toFixed(2)}</h3>}
              <div className="photo-grid">
                {active.photos.map((photo) => <img key={photo.id} src={`${API.replace('/api', '')}${photo.url}`} alt={photo.original_name} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function QuoteEditor({ api, quote, onCancel, onSaved }) {
  const [sections, setSections] = useState([]);
  const [section, setSection] = useState('');
  const [items, setItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(() => quote.items.map((item) => ({
    priceItemId: item.price_item_id,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity
  })));

  useEffect(() => { api.sections().then((data) => { setSections(data); setSection(data[0]?.section || ''); }); }, [api]);
  useEffect(() => { if (section) api.prices(section).then(setItems); }, [api, section]);

  function addItem(item) {
    setSelected((current) => current.some((line) => line.priceItemId === item.id)
      ? current
      : [...current, { priceItemId: item.id, description: item.description, unit: item.unit, quantity: 1 }]);
  }

  function updateQty(id, quantity) {
    setSelected((current) => current.map((item) => item.priceItemId === id ? { ...item, quantity } : item));
  }

  function removeItem(id) {
    setSelected((current) => current.filter((item) => item.priceItemId !== id));
  }

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    const body = new FormData();
    body.append('payload', JSON.stringify({ items: selected }));
    photos.forEach((file) => body.append('photos', file));
    try {
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

      <div className="section-tabs compact">
        {sections.map((s) => <button type="button" className={s.section === section ? 'chip active' : 'chip'} key={s.section} onClick={() => setSection(s.section)}>{s.section}</button>)}
      </div>
      <div className="item-list compact-list">
        {items.map((item) => (
          <button type="button" key={item.id} className="item-row" onClick={() => addItem(item)}>
            <span>{item.description}</span>
            <small>{item.category} | {item.unit}</small>
            <Plus size={17} />
          </button>
        ))}
      </div>

      <h3>Selected Items</h3>
      {selected.map((item) => (
        <div className="selected-line" key={item.priceItemId}>
          <div><strong>{item.description}</strong><span>{item.unit}</span></div>
          <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateQty(item.priceItemId, e.target.value)} />
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
function PageTitle({ title, subtitle }) {
  return <header className="page-title"><h1>{title}</h1><p>{subtitle}</p></header>;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

createRoot(document.getElementById('root')).render(<App />);
