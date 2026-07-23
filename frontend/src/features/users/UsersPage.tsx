import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { ROLE_LABELS, ROLES } from '../../app/roles';
import { PageTitle } from '../../shared/components/PageTitle';
import { getApiErrorMessage, useCreateUserMutation, useGetUsersQuery } from '../../services/baseApi';
import type { CreateUserRequestDto } from '../../services/apiDtos';
import type { Role } from '../../app/roles';

export function UsersView() {
  const emptyForm: CreateUserRequestDto = { name: '', email: '', password: '', role: ROLES.ASSESSOR };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: users = [], error: usersError } = useGetUsersQuery();
  const [createUser, { isLoading: saving }] = useCreateUserMutation();
  const error = actionError || (usersError ? getApiErrorMessage(usersError) : '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setActionError('');
    try {
      const created = await createUser(form).unwrap();
      setForm(emptyForm);
      setMessage(`${created.name} was registered as ${ROLE_LABELS[created.role]}.`);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
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
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
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
