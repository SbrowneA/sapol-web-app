import { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: Date) => void;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDisplay(date: Date): string {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const result: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) result.push(null);
  for (let d = 1; d <= daysInMonth; d++) result.push(d);
  return result;
}

export function DatePicker({ value, onChange, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(value || Date.now()));
  const popupRef = useRef<HTMLDivElement>(null);

  const currentDate = value ? new Date(value) : new Date();

  useEffect(() => {
    if (value) setViewMonth(new Date(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handlePrevDay = () => {
    if (disabled) return;
    onChange(addDays(currentDate, -1));
  };

  const handleNextDay = () => {
    if (disabled) return;
    onChange(addDays(currentDate, 1));
  };

  const handleToday = () => {
    if (disabled) return;
    onChange(new Date());
    setOpen(false);
  };

  const handlePrevMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() - 1);
    setViewMonth(d);
  };

  const handleNextMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + 1);
    setViewMonth(d);
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onChange(d);
    setOpen(false);
  };

  const calendarDays = getCalendarDays(viewMonth.getFullYear(), viewMonth.getMonth());
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="date-picker">
      <div className="date-picker-nav">
        <button
          type="button"
          className="date-nav-btn"
          onClick={handlePrevDay}
          disabled={disabled}
          aria-label="Previous day"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          className="date-display"
          onClick={() => !disabled && setOpen((o) => !o)}
          disabled={disabled}
          aria-label="Select date"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          {formatDisplay(currentDate)}
        </button>
        <button
          type="button"
          className="date-nav-btn"
          onClick={handleNextDay}
          disabled={disabled}
          aria-label="Next day"
        >
          <ChevronRight />
        </button>
        <button
          type="button"
          className="date-today-btn"
          onClick={handleToday}
          disabled={disabled}
          aria-label="Go to today"
        >
          Today
        </button>
      </div>

      {open && (
        <div
          ref={popupRef}
          className="date-picker-popup"
          role="dialog"
          aria-modal="true"
          aria-label="Choose date"
        >
          <div className="date-picker-header">
            <button type="button" className="month-nav-btn" onClick={handlePrevMonth} aria-label="Previous month">
              <ChevronLeft />
            </button>
            <h3 className="date-picker-month">
              {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </h3>
            <button type="button" className="month-nav-btn" onClick={handleNextMonth} aria-label="Next month">
              <ChevronRight />
            </button>
          </div>
          <div className="date-picker-weekdays">
            {weekDays.map((d) => (
              <span key={d} className="weekday">
                {d}
              </span>
            ))}
          </div>
          <div className="date-picker-grid">
            {calendarDays.map((day, i) =>
              day === null ? (
                <span key={`empty-${i}`} className="day-cell empty" />
              ) : (
                <button
                  key={day}
                  type="button"
                  className={`day-cell ${day === currentDate.getDate() && viewMonth.getMonth() === currentDate.getMonth() && viewMonth.getFullYear() === currentDate.getFullYear() ? 'selected' : ''}`}
                  onClick={() => handleSelectDay(day)}
                >
                  {day}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
