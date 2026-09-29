// Latin digits in both languages so figures match what users type.
function numberLocale(language: string) {
  return language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
}

export function formatNumber(value: number, language: string, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(numberLocale(language), { maximumFractionDigits }).format(value);
}

const CURRENCY_LABELS: Record<string, { ar: string; en: string }> = {
  SAR: { ar: 'ر.س', en: 'SAR' },
};

export function currencyLabel(currency: string, language: string) {
  const labels = CURRENCY_LABELS[currency];
  return labels ? (language === 'ar' ? labels.ar : labels.en) : currency;
}

/** e.g. "1,800 SAR" / "1,800 ر.س"; shows halalas only when present. */
export function formatMoney(value: number, currency: string, language: string) {
  return `${formatNumber(value, language, 2)} ${currencyLabel(currency, language)}`;
}
