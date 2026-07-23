import { useEffect, useState, type FormEvent } from 'react';
import mrsLogo from '../../assets/mrs-logo.png';
import { getApiErrorMessage, useGetSetupStatusQuery, useLoginMutation, useSetupFirstAdminMutation } from '../../services/baseApi';
import type { Session } from '../../services/sessionService';

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [login] = useLoginMutation();
  const [setupFirstAdmin] = useSetupFirstAdminMutation();
  const { data: setupStatus } = useGetSetupStatusQuery(undefined, { pollingInterval: 30_000 });
  const [setupMode, setSetupMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (setupStatus && !setupStatus.setup_available) setSetupMode(false);
  }, [setupStatus]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    try {
      const session = setupMode
        ? await setupFirstAdmin({ name, email, password }).unwrap()
        : await login({ email, password }).unwrap();
      onLogin(session);
    } catch (err) {
      setError(getApiErrorMessage(err));
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
        {setupStatus?.setup_available && (
          <button className="secondary" type="button" onClick={() => { setSetupMode(!setupMode); setError(''); }}>
            {setupMode ? 'Back to sign in' : 'First-time setup'}
          </button>
        )}
      </form>
    </div>
  );
}
