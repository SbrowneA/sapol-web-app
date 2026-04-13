import { useState, useRef, useEffect } from 'react';

import {
  addSapolCalendarDays,
  dateFromSapolYmd,
  getSapolYmdFromInstant,
  parseSapolDateString,
  type SapolYmd,
} from '../lib/sapolDate';

/**
 * `value` is the SAPOL day as `YYYY-MM-DD` for **South Australia (Adelaide)**. Navigation and
 * “Today” follow that same meaning, not the visitor’s laptop timezone.
 */
interface DatePickerProps {
  value: string;
  onChange: (date: Date) => void;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Short label for one SA calendar day (for the main control, not dependent on browser TZ). */
function formatDisplay(ymd: SapolYmd): string {
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12)).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type CalendarCell = { key: string; day: number | null };

/**
 * Month grid for the popup (padding + days 1…N). Weekday columns follow the device locale for
 * layout only; the **selected date** is still the SA `YYYY-MM-DD` from props.
 */
function getCalendarDays(year: number, monthZeroIndexed: number): CalendarCell[] {
  const first = new Date(year, monthZeroIndexed, 1);
  const last = new Date(year, monthZeroIndexed + 1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const result: CalendarCell[] = [];
  for (let i = 0; i < startDay; i++) {
    result.push({ key: `pad-${year}-${monthZeroIndexed}-${i}`, day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    result.push({ key: `day-${year}-${monthZeroIndexed}-${d}`, day: d });
  }
  return result;
}

/** Year and month (1–12) for the open calendar’s page. */
type ViewMonth = { year: number; month: number };

function viewMonthFromYmd(ymd: SapolYmd): ViewMonth {
  return { year: ymd.year, month: ymd.month };
}

/** Which month the popup opens on: from `value`, or SA “today” if `value` is invalid. */
function initialViewMonth(value: string): ViewMonth {
  try {
    return viewMonthFromYmd(parseSapolDateString(value));
  } catch {
    return viewMonthFromYmd(getSapolYmdFromInstant(new Date()));
  }
}

/**
 * Picks which **South Australian (SAPOL) day** to show. “Today” = today in `Australia/Adelaide`;
 * prev/next move the SAPOL `YYYY-MM-DD` by one SA calendar day, regardless of where the user sits.
 */
export function DatePicker({ value, onChange, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() => initialViewMonth(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const popupRef = useRef<HTMLDivElement>(null);

  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value) {
      try {
        setViewMonth(viewMonthFromYmd(parseSapolDateString(value)));
      } catch {
        setViewMonth(viewMonthFromYmd(getSapolYmdFromInstant(new Date())));
      }
    }
  }

  let currentYmd: SapolYmd;
  try {
    currentYmd = parseSapolDateString(value);
  } catch {
    currentYmd = getSapolYmdFromInstant(new Date());
  }

  useEffect(() => {
    if (!open) return;
    const handleDismissOutside = (e: MouseEvent | PointerEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDismissOutside);
    document.addEventListener('pointerdown', handleDismissOutside);
    return () => {
      document.removeEventListener('mousedown', handleDismissOutside);
      document.removeEventListener('pointerdown', handleDismissOutside);
    };
  }, [open]);

  const handlePrevDay = () => {
    if (disabled) return;
    onChange(dateFromSapolYmd(addSapolCalendarDays(currentYmd, -1)));
  };

  const handleNextDay = () => {
    if (disabled) return;
    onChange(dateFromSapolYmd(addSapolCalendarDays(currentYmd, 1)));
  };

  const handleToday = () => {
    if (disabled) return;
    onChange(dateFromSapolYmd(getSapolYmdFromInstant(new Date())));
    setOpen(false);
  };

  const handlePrevMonth = () => {
    setViewMonth((vm) => {
      if (vm.month === 1) return { year: vm.year - 1, month: 12 };
      return { year: vm.year, month: vm.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setViewMonth((vm) => {
      if (vm.month === 12) return { year: vm.year + 1, month: 1 };
      return { year: vm.year, month: vm.month + 1 };
    });
  };

  const handleSelectDay = (day: number) => {
    onChange(dateFromSapolYmd({ year: viewMonth.year, month: viewMonth.month, day }));
    setOpen(false);
  };

  const monthZero = viewMonth.month - 1;
  const calendarDays = getCalendarDays(viewMonth.year, monthZero);
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
          {formatDisplay(currentYmd)}
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
              {MONTH_NAMES[monthZero]} {viewMonth.year}
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
            {calendarDays.map((cell) => {
              if (cell.day === null) {
                return <span key={cell.key} className="day-cell empty" />;
              }
              const day = cell.day;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={`day-cell ${day === currentYmd.day && viewMonth.month === currentYmd.month && viewMonth.year === currentYmd.year ? 'selected' : ''}`}
                  onClick={() => handleSelectDay(day)}
                >
                  {day}
                </button>
              );
            })}
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
