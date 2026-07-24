import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Check } from 'lucide-react';
import { ROLES, type Role } from '../../app/roles';
import { DateTimePicker } from '../../shared/components/DateTimePicker';
import { PageTitle } from '../../shared/components/PageTitle';
import { addDays, formatDateOnly, formatTime, isSameDay, startOfWeek } from '../../shared/date/dateUtils';
import { useCurrentTime } from '../../shared/date/useCurrentTime';
import { getApiErrorMessage, useCancelAppointmentMutation, useGetAppointmentsQuery, useGetAssessorsQuery, useGetClientsQuery, useUpdateAppointmentMutation } from '../../services/baseApi';
import type { AppointmentDto, AppointmentRequestDto, UserDto } from '../../services/apiDtos';
import { getQuoteSla } from '../quotes/domain/quoteSla';

interface CalendarViewProps {
  role: Role;
  onStartQuote?: (appointment: AppointmentDto) => void;
  onOpenQuote?: (quoteId: number) => void;
}

export function CalendarView({ role, onStartQuote, onOpenQuote }: CalendarViewProps) {
  const [assessorId, setAssessorId] = useState('');
  const [editingAppointment, setEditingAppointment] = useState<AppointmentDto | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const currentTime = useCurrentTime();

  const isAssessor = role === ROLES.ASSESSOR;
  const isAdmin = role === ROLES.ADMIN;
  const isScheduleAdministrator = role === ROLES.SCHEDULE_ADMINISTRATOR;
  const isQuoteAdministrator = role === ROLES.QUOTE_ADMINISTRATOR;
  const isManagement = role === ROLES.MANAGEMENT;
  const canFilterAssessors = isScheduleAdministrator || isManagement || isAdmin;
  const isQuoteTaskCalendar = isQuoteAdministrator || isManagement;
  const canStartQuote = isAssessor || isAdmin;
  const canManageAppointments = isScheduleAdministrator || isAdmin;
  const { data: assessors = [] } = useGetAssessorsQuery(undefined, { skip: !canFilterAssessors });
  const { data: appointments = [], refetch: refetchAppointments } = useGetAppointmentsQuery(assessorId);

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = addDays(weekStart, 7);
  const weekAppointments = appointments.filter((appt) => {
    const date = new Date(appt.appointment_start);
    return date >= weekStart && date < weekEnd;
  });

  function appointmentsForDay(day: Date) {
    return weekAppointments
      .filter((appt) => isSameDay(new Date(appt.appointment_start), day))
      .sort((a, b) => new Date(a.appointment_start).getTime() - new Date(b.appointment_start).getTime());
  }

  function handleEventClick(item: AppointmentDto) {
    if (item.calendar_type === 'quote_task' && item.quote_id) onOpenQuote?.(item.quote_id);
    else if (canManageAppointments) setEditingAppointment(item);
    else if (canStartQuote) onStartQuote?.(item);
  }

  async function appointmentChanged() {
    setEditingAppointment(null);
    await refetchAppointments();
  }

  const subtitle = isQuoteTaskCalendar
    ? role === 'quote_administrator'
      ? 'Approved quotes ready for ERP recapture.'
      : 'Submitted quotes awaiting your approval.'
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
              {appointmentsForDay(day).map((appt) => {
                const sla = appt.calendar_type === 'quote_task' && appt.status === 'approved'
                  ? getQuoteSla(appt.appointment_start, currentTime)
                  : null;
                const eventClassName = sla
                  ? `calendar-event quote-task-event sla-${sla.state}`
                  : 'calendar-event';
                return (
                <button type="button" className={eventClassName} key={`${appt.calendar_type}-${appt.id || appt.quote_id}`} onClick={() => handleEventClick(appt)}>
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
                );
              })}
              {appointmentsForDay(day).length === 0 && <div className="calendar-empty">{isQuoteTaskCalendar ? 'No outstanding quotes' : 'No appointments'}</div>}
            </div>
          </div>
        ))}
      </div>
      {editingAppointment && (
        <AppointmentEditorDialog
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

interface AppointmentEditorDialogProps {
  appointment: AppointmentDto;
  assessors: UserDto[];
  canStartQuote: boolean;
  onStartQuote: (appointment: AppointmentDto) => void;
  onChanged: () => Promise<void>;
  onClose: () => void;
}

function AppointmentEditorDialog({ appointment, assessors, canStartQuote, onStartQuote, onChanged, onClose }: AppointmentEditorDialogProps) {
  const [form, setForm] = useState<AppointmentRequestDto>({
    assessorId: appointment.assessor_id,
    clientId: appointment.client_id || 0,
    siteAddress: appointment.site_address,
    requestDetails: appointment.request_details,
    appointmentStart: appointment.appointment_start,
    appointmentEnd: appointment.appointment_end
  });
  const [clientSearch, setClientSearch] = useState(appointment.client_name || appointment.customer_name || '');
  const [error, setError] = useState('');
  const { data: clients = [] } = useGetClientsQuery(clientSearch);
  const [updateAppointment, { isLoading: updating }] = useUpdateAppointmentMutation();
  const [cancelAppointmentRequest, { isLoading: cancelling }] = useCancelAppointmentMutation();
  const saving = updating || cancelling;

  function chooseClientName(value: string) {
    setClientSearch(value);
    const selected = clients.find((client) => client.name.toLowerCase() === value.trim().toLowerCase());
    setForm((current) => ({ ...current, clientId: selected?.id || 0 }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!form.clientId) {
      setError('Select a client from the suggestions.');
      return;
    }
    try {
      if (!appointment.id) throw new Error('The appointment identifier is missing.');
      await updateAppointment({ id: appointment.id, body: form }).unwrap();
      await onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function cancelAppointment() {
    if (!window.confirm('Cancel and permanently remove this appointment? This cannot be undone.')) return;
    setError('');
    try {
      if (!appointment.id) throw new Error('The appointment identifier is missing.');
      await cancelAppointmentRequest(appointment.id).unwrap();
      await onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit appointment</DialogTitle>
      <DialogContent>
        <form className="stack appointment-editor" onSubmit={save}>
          <label>Assessor
            <select value={form.assessorId} onChange={(event) => setForm({ ...form, assessorId: Number(event.target.value) })}>
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
