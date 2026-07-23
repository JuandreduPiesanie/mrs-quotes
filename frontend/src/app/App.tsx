import React from 'react';
import { CalendarDays, ClipboardList, LogOut, Plus, UserRound } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import mrsLogo from '../assets/mrs-logo.png';
import { useAppDispatch, useAppSelector } from './hooks';
import { getRoleCapabilities, ROLE_LABELS } from './roles';
import { sessionEnded, sessionStarted } from '../features/auth/authSlice';
import { quoteWizardReset } from '../features/quotes/state/quoteWizardSlice';
import { Login } from '../features/auth/LoginPage';
import { clearSession, writeSession, type Session } from '../services/sessionService';
import { baseApi } from '../services/baseApi';
import { AppRoutes } from './AppRoutes';

export default function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const session = useAppSelector((state) => state.auth.session);

  function saveSession(next: Session) {
    writeSession(next);
    dispatch(sessionStarted(next));
  }

  function logout() {
    clearSession();
    dispatch(baseApi.util.resetApiState());
    dispatch(quoteWizardReset());
    dispatch(sessionEnded());
    navigate('/calendar', { replace: true });
  }

  if (!session) return <Login onLogin={saveSession} />;

  const role = session.user.role;
  const {
    isAdmin,
    isAssessor,
    isScheduleAdministrator,
    isManagement,
    canViewQuotes
  } = getRoleCapabilities(role);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand logo-brand">
          <img className="brand-logo" src={mrsLogo} alt="Maintenance Risk Solutions" />
          <span>{ROLE_LABELS[role] || 'MRS User'}</span>
        </div>

        <nav>
          <NavButton icon={<CalendarDays />} label="Calendar" to="/calendar" />
          {canViewQuotes && <NavButton icon={<ClipboardList />} label={isAssessor ? 'My Quotes' : 'Outstanding Quotes'} to="/quotes" />}
          {(isAdmin || isScheduleAdministrator) && <NavButton icon={<Plus />} label="Schedule" to="/schedule" />}
          {(isAdmin || isManagement) && <NavButton icon={<UserRound />} label="Assignments" to="/assignments" />}
          {isAdmin && <NavButton icon={<Plus />} label="Users" to="/users" />}
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
        <AppRoutes role={role} />
      </main>
    </div>
  );
}

function NavButton({ icon, label, to }: { icon: React.ReactElement<{ size?: number }>; label: string; to: string }) {
  return <NavLink className={({ isActive }) => isActive ? 'nav active' : 'nav'} to={to}>{React.cloneElement(icon, { size: 19 })}<span>{label}</span></NavLink>;
}
