type DateValue = string | number | Date;

export interface TimeOption {
  value: string;
  label: string;
}

export function formatDate(value?: DateValue | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatDateOnly(value: DateValue) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function formatTime(value: DateValue) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function startOfWeek(value: DateValue) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value: DateValue, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}


export function parseDateTimeValue(value?: DateValue | null) {
  if (!value) {
    const now = new Date();
    const roundedMinutes = now.getMinutes() <= 30 ? 30 : 60;
    now.setMinutes(roundedMinutes, 0, 0);
    return { date: stripTime(now), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` };
  }
  const date = new Date(value);
  return {
    date: stripTime(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  };
}

export function formatDateTimeValue(date: Date, time: string) {
  return `${dateInputValue(date)}T${time}`;
}

export function formatDateTimeDisplay(value: DateValue) {
  const date = new Date(value);
  const day = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

export function buildTimeOptions() {
  const options: TimeOption[] = [];
  for (let hour = 8; hour <= 17; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 17 && minute === 30) continue;
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const label = new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      options.push({ value, label });
    }
  }
  return options;
}

export function buildPickerDays(monthDate: Date) {
  const first = startOfMonth(monthDate);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function startOfMonth(value: DateValue) {
  const date = new Date(value);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addMonths(value: DateValue, months: number) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return startOfMonth(date);
}

export function sameMonth(left: Date, right: Date) {
  return left.getMonth() === right.getMonth() && left.getFullYear() === right.getFullYear();
}
export function dateInputValue(value: DateValue) {
  const date = stripTime(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


export function stripTime(value: DateValue) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
