import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  addMonths,
  buildPickerDays,
  buildTimeOptions,
  formatDateTimeDisplay,
  formatDateTimeValue,
  isSameDay,
  parseDateTimeValue,
  sameMonth,
  startOfMonth,
  stripTime
} from '../date/dateUtils';

interface DateTimePickerProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  required?: boolean;
}

export function DateTimePicker({ label, value, onChange, required = false }: DateTimePickerProps) {
  const initial = parseDateTimeValue(value);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(initial.date);
  const [draftTime, setDraftTime] = useState(initial.time);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(initial.date));
  const times = useMemo(() => buildTimeOptions(), []);
  const days = useMemo(() => buildPickerDays(viewMonth), [viewMonth]);

  useEffect(() => {
    function closePicker(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closePicker);
    return () => document.removeEventListener('mousedown', closePicker);
  }, []);

  function openPicker() {
    const next = parseDateTimeValue(value);
    setDraftDate(next.date);
    setDraftTime(next.time);
    setViewMonth(startOfMonth(next.date));
    setOpen(true);
  }

  function chooseDate(day: Date) {
    const nextDate = stripTime(day);
    setDraftDate(nextDate);
    onChange(formatDateTimeValue(nextDate, draftTime));
  }

  function chooseTime(time: string) {
    setDraftTime(time);
    onChange(formatDateTimeValue(draftDate, time));
    setOpen(false);
  }

  return (
    <div className="datetime-picker-field" ref={pickerRef}>
      <label>{label}{required && <span> *</span>}</label>
      <button type="button" className={value ? 'datetime-trigger has-value' : 'datetime-trigger'} onClick={openPicker}>
        <CalendarDays size={16} />
        <span>{value ? formatDateTimeDisplay(value) : `Select ${label.toLowerCase()}`}</span>
      </button>
      {open && (
        <div className="datetime-popover">
          <div className="datetime-calendar">
            <div className="datetime-month-nav">
              <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, -1))} aria-label="Previous month">&lsaquo;</button>
              <strong>{viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
              <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} aria-label="Next month">&rsaquo;</button>
            </div>
            <div className="datetime-weekdays">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="datetime-days">
              {days.map((day) => (
                <button
                  type="button"
                  key={day.toISOString()}
                  className={[
                    sameMonth(day, viewMonth) ? '' : 'muted',
                    isSameDay(day, new Date()) ? 'today' : '',
                    isSameDay(day, draftDate) ? 'selected' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => chooseDate(day)}
                >
                  {day.getDate()}
                </button>
              ))}
            </div>
          </div>
          <div className="datetime-times">
            <strong>Available times</strong>
            <div className="datetime-time-list">
              {times.map((time) => (
                <button type="button" className={time.value === draftTime ? 'selected' : ''} key={time.value} onClick={() => chooseTime(time.value)}>
                  {time.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
