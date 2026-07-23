import React, { useState } from 'react';
import { CalendarDays, ClipboardList, LogOut, Menu, Plus, UserRound, X } from 'lucide-react';
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
import { PwaInstallAction } from '../shared/pwa/PwaInstallAction';

export default function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const session = useAppSelector((state) => state.auth.session);
  const [navigationOpen, setNavigationOpen] = useState(false);

  function saveSession(next: Session) {
    writeSession(next);
    dispatch(sessionStarted(next));
  }

  function logout() {
    setNavigationOpen(false);
    clearSession();
    dispatch(baseApi.util.resetApiState());
    dispatch(quoteWizardReset());
    dispatch(sessionEnded());
    navigate('/calendar', { replace: true });
  }

  if (!session) return (
    <>
      <Login onLogin={saveSession} />
      <PwaInstallAction />
    </>
  );

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
      <aside className={navigationOpen ? 'sidebar nav-open' : 'sidebar'}>
        <div className="brand logo-brand">
          <img className="brand-logo" src={mrsLogo} alt="Maintenance Risk Solutions" />
          <span>{ROLE_LABELS[role] || 'MRS User'}</span>
        </div>

        <button
          type="button"
          className="nav-toggle"
          aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navigationOpen}
          aria-controls="primary-navigation"
          onClick={() => setNavigationOpen((open) => !open)}
        >
          {navigationOpen ? <X size={24} /> : <Menu size={24} />}
          <span>{navigationOpen ? 'Close' : 'Menu'}</span>
        </button>

        <nav id="primary-navigation" className="sidebar-nav">
          <NavButton icon={<CalendarDays />} label="Calendar" to="/calendar" onNavigate={() => setNavigationOpen(false)} />
          {canViewQuotes && <NavButton icon={<ClipboardList />} label={isAssessor ? 'My Quotes' : 'Outstanding Quotes'} to="/quotes" onNavigate={() => setNavigationOpen(false)} />}
          {(isAdmin || isScheduleAdministrator) && <NavButton icon={<Plus />} label="Schedule" to="/schedule" onNavigate={() => setNavigationOpen(false)} />}
          {(isAdmin || isManagement) && <NavButton icon={<UserRound />} label="Assignments" to="/assignments" onNavigate={() => setNavigationOpen(false)} />}
          {isAdmin && <NavButton icon={<Plus />} label="Users" to="/users" onNavigate={() => setNavigationOpen(false)} />}
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
      <PwaInstallAction />
    </div>
  );
}

function NavButton({ icon, label, to, onNavigate }: { icon: React.ReactElement<{ size?: number }>; label: string; to: string; onNavigate: () => void }) {
  return <NavLink className={({ isActive }) => isActive ? 'nav active' : 'nav'} to={to} onClick={onNavigate}>{React.cloneElement(icon, { size: 19 })}<span>{label}</span></NavLink>;
}
