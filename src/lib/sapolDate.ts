/**
 * Helpers for **South Australian dates** (`Australia/Adelaide`), matching how SAPOL labels
 * camera data: “which day is it in SA when you read the calendar there?” — not the day in UTC,
 * and not “which day is it in the visitor’s browser timezone”.
 *
 * SAPOL gives us a `YYYY-MM-DD` for that SA day. We must send the same label to the API and
 * use it in the date picker so “Today” means today in Adelaide even when UTC is still yesterday.
 */

/**
 * IANA id for South Australia (Adelaide), including DST rules SAPOL follows.
 * @see formatSapolDate
 */
export const SAPOL_TIME_ZONE = 'Australia/Adelaide';

const sapolYmdFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: SAPOL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Turn a JavaScript `Date` into the `YYYY-MM-DD` **SAPOL expects for South Australia** —
 * the year, month, and day you’d use in Adelaide at that moment.
 *
 * Do not use `toISOString().slice(0, 10)` here: that is **UTC**, so late evening in SA can
 * still be “yesterday” in UTC and the wrong day would be requested from the API.
 *
 * @param date - Any instant; from the picker it’s usually built with {@link dateFromSapolYmd}.
 * @returns The SA calendar date as `YYYY-MM-DD`.
 * @throws If `Intl` cannot produce year/month/day parts.
 */
export function formatSapolDate(date: Date): string {
  const parts = sapolYmdFormatter.formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error('Could not format date in Australia/Adelaide');
  }
  return `${y}-${m}-${d}`;
}

const sapolPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SAPOL_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

/**
 * One **South Australian calendar day** as SAPOL uses it: plain year / month / day numbers
 * (`month` is 1–12). Same meaning as the `YYYY-MM-DD` string, split apart for arithmetic.
 */
export interface SapolYmd {
  year: number;
  month: number;
  day: number;
}

/**
 * What day it is **right now in South Australia** — used for the Today button and fallbacks.
 *
 * @param date - Usually `new Date()` (the current moment).
 */
export function getSapolYmdFromInstant(date: Date): SapolYmd {
  const parts = sapolPartsFormatter.formatToParts(date);
  let year = 0;
  let month = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === 'year') year = Number.parseInt(p.value, 10);
    if (p.type === 'month') month = Number.parseInt(p.value, 10);
    if (p.type === 'day') day = Number.parseInt(p.value, 10);
  }
  if (!year || !month || !day) {
    throw new Error('Could not read Adelaide calendar parts');
  }
  return { year, month, day };
}

/**
 * Read our `YYYY-MM-DD` value as the **SA calendar day** SAPOL named: the digits are the day
 * itself (not reinterpreted in UTC or the user’s local zone).
 *
 * @param value - Must look like `YYYY-MM-DD` and be a real calendar date.
 * @throws If the string is malformed or invalid (e.g. `2026-02-31`).
 */
export function parseSapolDateString(value: string): SapolYmd {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid SAPOL date string: ${value}`);
  }
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid SAPOL date string: ${value}`);
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return { year, month, day };
}

/**
 * Internal `Date` value for one SA day. We use UTC midnight on those numbers only so
 * {@link formatSapolDate} round-trips with the picker and hook — the **meaning** is still
 * “this SAPOL day in South Australia”, not “midnight UTC as a real-world moment”.
 */
export function dateFromSapolYmd({ year, month, day }: SapolYmd): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Move **one SAPOL / SA calendar day** forward or back (what prev/next on the picker should do),
 * using normal calendar rules (month lengths, leap years). Same idea as turning one page on
 * a wall calendar for South Australia, not “add 24 hours in a timezone”.
 *
 * @param ymd - Starting SA year/month/day.
 * @param deltaDays - Negative for previous day, positive for next.
 */
export function addSapolCalendarDays(ymd: SapolYmd, deltaDays: number): SapolYmd {
  const u = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + deltaDays));
  return {
    year: u.getUTCFullYear(),
    month: u.getUTCMonth() + 1,
    day: u.getUTCDate(),
  };
}
