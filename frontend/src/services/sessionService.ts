import type { AuthResultDto, UserSessionDto } from './apiDtos';

const SESSION_KEY = 'mrs-session';

export type SessionUser = UserSessionDto;
export type Session = AuthResultDto;

export function readSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
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
