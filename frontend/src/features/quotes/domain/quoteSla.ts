export type QuoteSlaState = 'green' | 'orange' | 'red';

export interface QuoteSla {
  state: QuoteSlaState;
  label: string;
  elapsedMinutes: number;
  remainingMinutes: number;
  breached: boolean;
}

const MINUTE_MS = 60_000;
const GREEN_WINDOW_MINUTES = 60;
const RED_WINDOW_START_MINUTES = 150;
const SLA_DEADLINE_MINUTES = 180;

export function getQuoteSla(approvedAt: string | null, now = Date.now()): QuoteSla | null {
  if (!approvedAt) return null;
  const approvedTime = new Date(approvedAt).getTime();
  const elapsedMinutes = Number.isFinite(approvedTime)
    ? Math.max(0, Math.floor((now - approvedTime) / MINUTE_MS))
    : 0;
  const remainingMinutes = Math.max(0, SLA_DEADLINE_MINUTES - elapsedMinutes);
  const breached = elapsedMinutes >= SLA_DEADLINE_MINUTES;
  const state: QuoteSlaState = elapsedMinutes < GREEN_WINDOW_MINUTES
    ? 'green'
    : elapsedMinutes < RED_WINDOW_START_MINUTES
      ? 'orange'
      : 'red';

  return {
    state,
    label: breached ? 'SLA breached' : `${formatDuration(remainingMinutes)} remaining`,
    elapsedMinutes,
    remainingMinutes,
    breached
  };
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
