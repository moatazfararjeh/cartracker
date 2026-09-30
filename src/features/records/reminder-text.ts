import type { TFunction } from 'i18next';

import type { UpcomingItem } from '@/features/records/api';
import { lookupName } from '@/features/vehicles/lookups';
import { formatDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';

/** Title + detail line for a reminder, e.g. "Oil change coming up" / "Due at 85,000 km · 2,550 km left". */
export function reminderText(item: UpcomingItem, t: TFunction, lang: string) {
  const name = item.expense_category
    ? t(`expenseCategories.${item.expense_category}`)
    : lookupName(item, lang);

  const title =
    item.status === 'overdue'
      ? t('home.dueOverdue', { name })
      : item.status === 'soon'
        ? t('home.dueSoon', { name })
        : t('home.dueOk', { name });

  let detail = '';
  if (item.due_km != null && item.km_left != null) {
    const left =
      item.km_left >= 0
        ? t('home.kmLeft', { km: formatNumber(item.km_left, lang) })
        : t('home.kmOver', { km: formatNumber(-item.km_left, lang) });
    detail = `${t('home.dueAtKm', { km: formatNumber(item.due_km, lang) })} · ${left}`;
  } else if (item.due_date && item.days_left != null) {
    const left =
      item.days_left >= 0
        ? t('home.daysLeft', { count: item.days_left })
        : t('home.daysOver', { count: -item.days_left });
    detail = `${t('home.dueOnDate', { date: formatDate(item.due_date, lang, true) })} · ${left}`;
  }

  return { title, detail };
}
