import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

/** Local calendar date as YYYY-MM-DD (what Postgres `date` columns expect). */
export function toISODate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function todayISO() {
  return toISODate(new Date());
}

export function parseISODate(value: string) {
  return parseISO(value);
}

/** e.g. "24 Sep" or "24 Sep 2026" in the UI language. */
export function formatDate(value: string, language: string, withYear = false) {
  return format(parseISO(value), withYear ? 'd MMM yyyy' : 'd MMM', {
    locale: language === 'ar' ? arSA : enUS,
  });
}
