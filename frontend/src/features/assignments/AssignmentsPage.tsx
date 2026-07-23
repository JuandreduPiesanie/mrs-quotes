import { useState } from 'react';
import { PageTitle } from '../../shared/components/PageTitle';
import { getApiErrorMessage, useAssignQuoteAdministratorMutation, useGetAssessorsQuery, useGetQuoteAdministratorsQuery } from '../../services/baseApi';
import type { UserDto } from '../../services/apiDtos';

export function AssignmentsView() {
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: assessors = [], error: assessorsError } = useGetAssessorsQuery();
  const { data: quoteAdministrators = [], error: administratorsError } = useGetQuoteAdministratorsQuery();
  const [assignQuoteAdministrator] = useAssignQuoteAdministratorMutation();
  const error = actionError || (assessorsError || administratorsError ? getApiErrorMessage(assessorsError || administratorsError) : '');

  async function assign(assessor: UserDto, value: string) {
    const quoteAdministratorId = value ? Number(value) : null;
    setSavingId(assessor.id);
    setMessage('');
    setActionError('');
    try {
      const updated = await assignQuoteAdministrator({ assessorId: assessor.id, quoteAdministratorId }).unwrap();
      setMessage(`${updated.name} is now assigned to ${updated.quote_administrator_name || 'no Quote Administrator'}.`);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
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
