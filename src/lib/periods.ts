import { addMonths, addYears, startOfMonth, startOfYear } from 'date-fns';

import { toISODate } from '@/lib/dates';

/** A date range [from, to) as YYYY-MM-DD; null means unbounded. */
export type Period = { from: string | null; to: string | null };

export const PERIOD_KEYS = ['thisMonth', 'lastMonth', 'last12Months', 'thisYear', 'lastYear', 'all'] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

/** The date range of a period preset, plus its first day (null for all time). */
export function periodRange(key: PeriodKey, now = new Date()): { range: Period; start: Date | null } {
  const month = startOfMonth(now);
  const year = startOfYear(now);
  const make = (from: Date, to: Date) => ({ range: { from: toISODate(from), to: toISODate(to) }, start: from });
  switch (key) {
    case 'thisMonth':
      return make(month, addMonths(month, 1));
    case 'lastMonth':
      return make(addMonths(month, -1), month);
    case 'last12Months':
      // The current month plus the 11 full months before it.
      return make(addMonths(month, -11), addMonths(month, 1));
    case 'thisYear':
      return make(year, addYears(year, 1));
    case 'lastYear':
      return make(addYears(year, -1), year);
    default:
      return { range: { from: null, to: null }, start: null };
  }
}

/** Apply [from, to) to a Supabase query on a date column. */
export function inPeriod<Q extends { gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q }>(
  query: Q,
  column: string,
  { from, to }: Period
) {
  let q = query;
  if (from) q = q.gte(column, from);
  if (to) q = q.lt(column, to);
  return q;
}
