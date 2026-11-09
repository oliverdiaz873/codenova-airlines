/**
 * Date and IANA time zone helpers for the flight prototype.
 * Source: PLAN_CODENOVA.md — sections 4.3, 4.7.1
 *
 * All calendar dates are handled as 'YYYY-MM-DD' strings in UTC to avoid
 * local-timezone drift. Flight times are wall-clock times interpreted in the
 * IANA zone of the airport where they occur.
 */

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormat(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  return Number(parts.find((part) => part.type === type)?.value ?? 0);
}

/** Today's date as 'YYYY-MM-DD' in the browser's local timezone. */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Adds (or subtracts) whole days to a 'YYYY-MM-DD' date. */
export function addDaysISO(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Day of week for a 'YYYY-MM-DD' date: 0 = Sunday … 6 = Saturday. */
export function weekdayISO(dateISO: string): number {
  return new Date(`${dateISO}T12:00:00.000Z`).getUTCDay();
}

/** Approved days of operation: Monday, Wednesday, Friday (PA-2, 4.3). */
export const OPERATING_WEEKDAYS = [1, 3, 5];

export function isOperatingDate(dateISO: string): boolean {
  return OPERATING_WEEKDAYS.includes(weekdayISO(dateISO));
}

export function isValidISODate(dateISO: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateISO;
}

/** First operating date on or after the given date. */
export function nextOperatingDateOnOrAfter(dateISO: string): string {
  let candidate = dateISO;
  for (let i = 0; i < 14; i += 1) {
    if (isOperatingDate(candidate)) return candidate;
    candidate = addDaysISO(candidate, 1);
  }
  return candidate;
}

/** Last operating date on or before the given date. */
export function lastOperatingDateOnOrBefore(dateISO: string): string {
  let candidate = dateISO;
  for (let i = 0; i < 14; i += 1) {
    if (isOperatingDate(candidate)) return candidate;
    candidate = addDaysISO(candidate, -1);
  }
  return candidate;
}

interface OffsetOverride {
  timeZone: string;
  /** Inclusive lower bound as a UTC instant in milliseconds. */
  fromMs: number;
  /** Exclusive upper bound as a UTC instant in milliseconds. */
  untilMs: number;
  offsetMinutes: number;
}

/**
 * Runtime tzdata overrides for rules newer than the ICU bundled with the
 * runtime. America/Havana: Cuba suspended the return to standard time until
 * 2027-11-07 (tzdb 2026f), so the zone stays at UTC-4 through that window.
 * ICU tz 2026b still applies the old "first Sunday in November" rule and
 * would report UTC-5; the override keeps the approved UTC-4 offset.
 */
const OFFSET_OVERRIDES: OffsetOverride[] = [
  {
    timeZone: 'America/Havana',
    fromMs: Date.parse('2026-11-01T05:00:00.000Z'),
    untilMs: Date.parse('2027-11-07T05:00:00.000Z'),
    offsetMinutes: -240,
  },
];

/** Returns the override offset in minutes, or null when not applicable. */
function offsetOverrideFor(
  timeZone: string,
  instantMs: number,
): number | null {
  for (const override of OFFSET_OVERRIDES) {
    if (
      override.timeZone === timeZone &&
      instantMs >= override.fromMs &&
      instantMs < override.untilMs
    ) {
      return override.offsetMinutes;
    }
  }
  return null;
}

/**
 * Offset of `timeZone` at `instant`, in milliseconds.
 * Positive values mean the zone is ahead of UTC.
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const overrideMinutes = offsetOverrideFor(timeZone, instant.getTime());
  if (overrideMinutes !== null) {
    return overrideMinutes * 60_000;
  }
  const parts = getDateTimeFormat(timeZone).formatToParts(instant);
  const wallClockAsUtc = Date.UTC(
    partValue(parts, 'year'),
    partValue(parts, 'month') - 1,
    partValue(parts, 'day'),
    partValue(parts, 'hour'),
    partValue(parts, 'minute'),
    partValue(parts, 'second'),
  );
  return wallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock date + time in `timeZone` to the corresponding UTC instant.
 * The offset is resolved for that date, so DST transitions are handled per occurrence.
 */
export function localDateTimeToUtc(
  dateISO: string,
  time: string,
  timeZone: string,
): Date {
  const naiveUtc = new Date(`${dateISO}T${time}:00.000Z`);
  const firstOffset = timeZoneOffsetMs(naiveUtc, timeZone);
  let utc = new Date(naiveUtc.getTime() - firstOffset);
  const refinedOffset = timeZoneOffsetMs(utc, timeZone);
  if (refinedOffset !== firstOffset) {
    utc = new Date(naiveUtc.getTime() - refinedOffset);
  }
  return utc;
}

/** Converts a UTC instant to wall-clock date + time in `timeZone`. */
export function utcToLocalDateTime(
  utc: Date,
  timeZone: string,
): { date: string; time: string } {
  const overrideMinutes = offsetOverrideFor(timeZone, utc.getTime());
  const effective =
    overrideMinutes === null
      ? utc
      : new Date(utc.getTime() + overrideMinutes * 60_000);
  const parts = getDateTimeFormat(
    overrideMinutes === null ? timeZone : 'UTC',
  ).formatToParts(effective);
  const hour = partValue(parts, 'hour') % 24;
  return {
    date: `${partValue(parts, 'year')}-${pad2(partValue(parts, 'month'))}-${pad2(partValue(parts, 'day'))}`,
    time: `${pad2(hour)}:${pad2(partValue(parts, 'minute'))}`,
  };
}
