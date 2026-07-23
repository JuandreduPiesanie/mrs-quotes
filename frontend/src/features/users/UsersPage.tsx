import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Save, X } from 'lucide-react';
import { ROLE_LABELS, ROLES } from '../../app/roles';
import { PageTitle } from '../../shared/components/PageTitle';
import {
  getApiErrorMessage,
  useCreateUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation
} from '../../services/baseApi';
import type { CreateUserRequestDto, UserDto } from '../../services/apiDtos';
import type { Role } from '../../app/roles';

interface UserForm extends CreateUserRequestDto {
  confirmPassword: string;
}

function emptyUserForm(): UserForm {
  return { name: '', email: '', password: '', confirmPassword: '', role: ROLES.ASSESSOR };
}

export function UsersView() {
  const [form, setForm] = useState<UserForm>(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: users = [], error: usersError } = useGetUsersQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const isEditing = editingUserId !== null;
  const saving = creating || updating;
  const error = actionError || (usersError ? getApiErrorMessage(usersError) : '');

  function beginEdit(user: UserDto) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role
    });
    setMessage('');
    setActionError('');
  }

  function resetForm() {
    setEditingUserId(null);
    setForm(emptyUserForm());
    setActionError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setActionError('');

    if (form.password !== form.confirmPassword) {
      setActionError('The password and confirmation do not match.');
      return;
    }

    const request = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role
    };

    try {
      if (editingUserId !== null) {
        const updated = await updateUser({ id: editingUserId, ...request }).unwrap();
        setMessage(`${updated.name}'s account was updated${form.password ? ' and the password was changed' : ''}.`);
      } else {
        const created = await createUser(request).unwrap();
        setMessage(`${created.name} was registered as ${ROLE_LABELS[created.role]}.`);
      }
      setEditingUserId(null);
      setForm(emptyUserForm());
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  }

  return (
    <section className="workspace user-management-workspace">
      <PageTitle title="User Management" subtitle="Register users, edit account details, assign roles, and reset passwords." />
      <div className="user-management-grid">
        <form className="panel stack user-form-panel" onSubmit={submit}>
          <div className="user-form-heading">
            <div>
              <h2>{isEditing ? 'Edit user' : 'Register user'}</h2>
              {isEditing && <span>Leave the password fields blank to keep the current password.</span>}
            </div>
            {isEditing && (
              <button className="icon-button user-form-close" type="button" onClick={resetForm} aria-label="Cancel editing">
                <X size={18} />
              </button>
            )}
          </div>

          <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Email address<input required type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>{isEditing ? 'New password (optional)' : 'Temporary password'}
            <input
              required={!isEditing}
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <label>{isEditing ? 'Confirm new password' : 'Confirm temporary password'}
            <input
              required={!isEditing || Boolean(form.password)}
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            />
          </label>
          <label>Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <div className="user-form-actions">
            <button className="primary" disabled={saving}>
              {isEditing ? <Save size={18} /> : <Plus size={18} />}
              {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Register user'}
            </button>
            {isEditing && <button className="secondary" type="button" onClick={resetForm}>Cancel</button>}
          </div>
          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </form>

        <div className="panel user-list-panel">
          <h2>Registered users</h2>
          <div className="user-list">
            {users.map((user) => (
              <div className={editingUserId === user.id ? 'user-list-row is-selected' : 'user-list-row'} key={user.id}>
                <div className="user-list-identity"><strong>{user.name}</strong><small>{user.email}</small></div>
                <div className="user-row-actions">
                  <span className="role-badge">{ROLE_LABELS[user.role] || user.role}</span>
                  <button className="secondary user-edit-button" type="button" onClick={() => beginEdit(user)}>
                    <Pencil size={16} /> Edit
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && <div className="empty">No users are registered.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
