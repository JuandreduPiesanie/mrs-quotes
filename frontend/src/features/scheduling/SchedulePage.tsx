import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { DateTimePicker } from '../../shared/components/DateTimePicker';
import { PageTitle } from '../../shared/components/PageTitle';
import { getApiErrorMessage, useCreateAppointmentMutation, useGetAssessorsQuery, useGetClientsQuery } from '../../services/baseApi';
import type { AppointmentRequestDto, ClientDto } from '../../services/apiDtos';

export function ScheduleView({ onCreated }: { onCreated: () => void }) {
  const [clientSearch, setClientSearch] = useState('');
  const [showClients, setShowClients] = useState(false);
  const [message, setMessage] = useState('');
  const clientFieldRef = useRef<HTMLLabelElement | null>(null);
  const [form, setForm] = useState<AppointmentRequestDto>({ clientId: 0, assessorId: 0, siteAddress: '', requestDetails: '', appointmentStart: '', appointmentEnd: null });
  const { data: assessors = [] } = useGetAssessorsQuery();
  const { data: clients = [] } = useGetClientsQuery(clientSearch);
  const [createAppointment, { isLoading: saving }] = useCreateAppointmentMutation();

  useEffect(() => {
    if (assessors.length && !form.assessorId) setForm((current) => ({ ...current, assessorId: assessors[0].id }));
  }, [assessors, form.assessorId]);

    useEffect(() => {
    function closeClientDropdown(event: MouseEvent) {
      if (clientFieldRef.current && !clientFieldRef.current.contains(event.target as Node)) setShowClients(false);
    }
    document.addEventListener('mousedown', closeClientDropdown);
    return () => document.removeEventListener('mousedown', closeClientDropdown);
  }, []);

  function selectClient(client: ClientDto) {
    setClientSearch(client.name);
    setShowClients(false);
    setForm((current) => ({ ...current, clientId: client.id }));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    try {
      if (!form.appointmentStart) {
        setMessage('Please select a start date and time.');
        return;
      }
      await createAppointment(form).unwrap();
      setMessage('Appointment scheduled.');
      setTimeout(onCreated, 500);
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    }
  }

  return (
    <section className="workspace narrow">
      <PageTitle title="Schedule Appointment" subtitle="Assign quotation requests to an assessor calendar." />
      <form className="panel stack" onSubmit={submit}>
        <label>Assessor<select value={form.assessorId} onChange={(e) => setForm({ ...form, assessorId: Number(e.target.value) })}>{assessors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="autocomplete-field" ref={clientFieldRef}>Client
          <input required value={clientSearch} onFocus={() => setShowClients(true)} onChange={(e) => { setClientSearch(e.target.value); setShowClients(true); setForm({ ...form, clientId: 0 }); }} placeholder="Search and select a client" />
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
        <button className="primary" disabled={saving}><Check size={18} />{saving ? 'Scheduling...' : 'Schedule'}</button>
      </form>
    </section>
  );
}
