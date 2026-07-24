import type { AuthResultDto, UserSessionDto } from './apiDtos';

const SESSION_KEY = 'mrs-session';

export type SessionUser = UserSessionDto;
export type Session = AuthResultDto;

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof decoded.exp === 'number' && Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

export function readSession(): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as Session | null;
    if (!session) return null;
    if (isTokenExpired(session.token)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
