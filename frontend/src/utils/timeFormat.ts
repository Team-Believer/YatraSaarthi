/**
 * YatraSaarthi - Centralized IST (Asia/Kolkata) Time and Date Formatter
 *
 * All user-facing dates and times across YatraSaarthi are normalized and
 * rendered in India Standard Time (IST, UTC+05:30, Asia/Kolkata).
 *
 * Browser/device local timezone does NOT determine the displayed time.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_LOCALE = 'en-IN';

// Offset in milliseconds (+5 hours 30 minutes)
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type DateBucket = 'Today' | 'Yesterday' | 'This week' | 'Earlier';

/**
 * Normalizes any timestamp input (ISO string, SQLite string, epoch seconds/ms, or Date)
 * into a valid UTC Date object without double-converting.
 */
export function parseToDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return null;
    // If epoch is in seconds (e.g. 1774350000), multiply by 1000
    const ms = input < 1e11 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if string is a numeric timestamp
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      const ms = num < 1e11 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    // Handle SQLite "YYYY-MM-DD HH:mm:ss" without offset -> treat as UTC
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
      const isoUtc = trimmed.replace(' ', 'T') + 'Z';
      const d = new Date(isoUtc);
      if (!isNaN(d.getTime())) return d;
    }

    // Handle "YYYY-MM-DDTHH:mm:ss" without trailing Z or offset -> treat as UTC
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
      const isoUtc = trimmed + 'Z';
      const d = new Date(isoUtc);
      if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Returns the calendar day number in IST (days since epoch in Asia/Kolkata).
 */
export function getISTDayNumber(date: Date): number {
  return Math.floor((date.getTime() + IST_OFFSET_MS) / MS_PER_DAY);
}

/**
 * Computes the relative date bucket ('Today' | 'Yesterday' | 'This week' | 'Earlier')
 * strictly aligned to Asia/Kolkata midnight calendar boundaries.
 */
export function getISTDateBucket(
  input: string | number | Date | null | undefined,
  nowReference: Date = new Date()
): DateBucket {
  const targetDate = parseToDate(input);
  if (!targetDate) return 'Earlier';

  const targetDay = getISTDayNumber(targetDate);
  const currentDay = getISTDayNumber(nowReference);
  const diff = currentDay - targetDay;

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff >= 2 && diff <= 6) return 'This week';
  return 'Earlier';
}

/**
 * Formats time in IST (e.g. "5:15 PM" or "12:15 AM").
 */
export function formatISTTime(
  input: string | number | Date | null | undefined,
  options?: { hour12?: boolean; includeSeconds?: boolean }
): string {
  const date = parseToDate(input);
  if (!date) return '';

  const hour12 = options?.hour12 ?? true;
  const includeSeconds = options?.includeSeconds ?? false;

  const formatter = new Intl.DateTimeFormat(IST_LOCALE, {
    timeZone: IST_TIMEZONE,
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12,
  });

  return formatter.format(date);
}

/**
 * Formats 24-hour time in IST (e.g. "17:15:30" or "17:15") for diagnostics/telemetry.
 */
export function formatISTTime24(
  input: string | number | Date | null | undefined,
  options?: { includeSeconds?: boolean }
): string {
  return formatISTTime(input, { hour12: false, includeSeconds: options?.includeSeconds ?? true });
}

/**
 * Formats date in IST (e.g. "23 Sep 2026", "23/09/2026", or "Wed, Sep 23, 2026").
 */
export function formatISTDate(
  input: string | number | Date | null | undefined,
  style: 'short' | 'medium' | 'full' | 'monthDay' = 'medium'
): string {
  const date = parseToDate(input);
  if (!date) return '';

  let opts: Intl.DateTimeFormatOptions;
  switch (style) {
    case 'short':
      opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
      break;
    case 'full':
      opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      break;
    case 'monthDay':
      opts = { month: 'short', day: 'numeric' };
      break;
    case 'medium':
    default:
      opts = { day: 'numeric', month: 'short', year: 'numeric' };
      break;
  }

  const formatter = new Intl.DateTimeFormat(IST_LOCALE, {
    timeZone: IST_TIMEZONE,
    ...opts,
  });

  return formatter.format(date);
}

/**
 * Formats full datetime in IST (e.g. "Wed, Sep 23, 2026, 5:15 PM").
 */
export function formatISTDateTime(
  input: string | number | Date | null | undefined
): string {
  const date = parseToDate(input);
  if (!date) return '';

  const formatter = new Intl.DateTimeFormat(IST_LOCALE, {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return formatter.format(date);
}

export interface FormattedTripDateTime {
  relativeDate: string;
  timeStr: string;
  fullDate: string;
  monthDay: string;
  bucket: DateBucket;
}

/**
 * Comprehensive trip datetime formatter tailored for the Trips page,
 * session details, and history drawers.
 */
export function formatTripDateTime(
  dateStr: string | number | Date | null | undefined,
  nowReference: Date = new Date()
): FormattedTripDateTime {
  const date = parseToDate(dateStr);
  if (!date) {
    return {
      relativeDate: 'Recorded trip',
      timeStr: '',
      fullDate: typeof dateStr === 'string' ? dateStr : 'Date unavailable',
      monthDay: '',
      bucket: 'Earlier',
    };
  }

  const bucket = getISTDateBucket(date, nowReference);
  const timeStr = formatISTTime(date, { hour12: true });
  const monthDay = formatISTDate(date, 'monthDay');
  const fullDate = formatISTDateTime(date);

  let relativeDate = monthDay;
  if (bucket === 'Today') relativeDate = 'Today';
  else if (bucket === 'Yesterday') relativeDate = 'Yesterday';

  return {
    relativeDate,
    timeStr,
    fullDate,
    monthDay,
    bucket,
  };
}
