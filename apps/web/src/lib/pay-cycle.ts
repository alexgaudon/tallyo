import { addDays, differenceInCalendarDays, format } from "date-fns";

/** The pay cadence is fixed at bi-weekly (every two weeks). */
export const PAY_CYCLE_DAYS = 14;

export type PayCycle = {
  /** The next pay day, at local midnight. */
  date: Date;
  /** Calendar days from today to the next pay day; 0 when today is pay day. */
  daysUntil: number;
  /** The most recent pay day, which starts the current cycle. */
  periodStart: Date;
  /** The last day before the next pay day. */
  periodEnd: Date;
  /** Countdown copy: "Today", "Tomorrow", or "in 11 days". */
  countdown: string;
};

/**
 * Parse a `YYYY-MM-DD` string as local midnight.
 *
 * Pay dates are calendar days, not instants: parsing with `new Date(string)`
 * would treat them as UTC and could shift the day in negative-offset timezones.
 */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Reject impossible dates such as 2026-02-31.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Serialize a local date as `YYYY-MM-DD`, the format stored in the database. */
export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Derive the pay cycle around `today` from a single anchor pay day.
 *
 * The anchor may be in the past or the future. We roll forward in 14-day steps
 * until the pay day on or after today, using calendar-day arithmetic so DST
 * changes and leap years cannot shift the result.
 */
export function getPayCycle(
  anchor: string,
  today: Date = new Date(),
): PayCycle | null {
  const anchorDate = parseDateOnly(anchor);
  if (!anchorDate) return null;

  const todayDate = startOfLocalDay(today);
  const daysSinceAnchor = differenceInCalendarDays(todayDate, anchorDate);

  // An anchor today or in the future is itself the next pay day.
  const cycles =
    daysSinceAnchor > 0 ? Math.ceil(daysSinceAnchor / PAY_CYCLE_DAYS) : 0;
  const nextDate = addDays(anchorDate, cycles * PAY_CYCLE_DAYS);
  const daysUntil = differenceInCalendarDays(nextDate, todayDate);

  return {
    date: nextDate,
    daysUntil,
    periodStart: addDays(nextDate, -PAY_CYCLE_DAYS),
    periodEnd: addDays(nextDate, -1),
    countdown:
      daysUntil === 0
        ? "Today"
        : daysUntil === 1
          ? "Tomorrow"
          : `in ${daysUntil} days`,
  };
}
