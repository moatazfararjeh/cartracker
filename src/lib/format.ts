// Latin digits in both languages so figures match what users type and the dates / plates around
// them. Always en-US: Hermes ignores the "-u-nu-latn" extension and would print Arabic-Indic digits.
const numberFormats = new Map<number, Intl.NumberFormat>();

export function formatNumber(value: number, _language: string, maximumFractionDigits = 0) {
  let format = numberFormats.get(maximumFractionDigits);
  if (!format) {
    format = new Intl.NumberFormat('en-US', { maximumFractionDigits });
    numberFormats.set(maximumFractionDigits, format);
  }
  return format.format(value);
}

/** Currencies offered in Settings, with the short label shown next to amounts. */
export const CURRENCIES: { code: string; ar: string; en: string; nameAr: string; nameEn: string }[] = [
  { code: 'SAR', ar: 'ر.س', en: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi riyal' },
  { code: 'AED', ar: 'د.إ', en: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE dirham' },
  { code: 'KWD', ar: 'د.ك', en: 'KWD', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti dinar' },
  { code: 'QAR', ar: 'ر.ق', en: 'QAR', nameAr: 'ريال قطري', nameEn: 'Qatari riyal' },
  { code: 'BHD', ar: 'د.ب', en: 'BHD', nameAr: 'دينار بحريني', nameEn: 'Bahraini dinar' },
  { code: 'OMR', ar: 'ر.ع', en: 'OMR', nameAr: 'ريال عماني', nameEn: 'Omani rial' },
  { code: 'JOD', ar: 'د.أ', en: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian dinar' },
  { code: 'EGP', ar: 'ج.م', en: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian pound' },
  { code: 'USD', ar: '$', en: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US dollar' },
  { code: 'EUR', ar: '€', en: 'EUR', nameAr: 'يورو', nameEn: 'Euro' },
];

const CURRENCY_LABELS: Record<string, { ar: string; en: string }> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, { ar: c.ar, en: c.en }])
);

export function currencyLabel(currency: string, language: string) {
  const labels = CURRENCY_LABELS[currency];
  return labels ? (language === 'ar' ? labels.ar : labels.en) : currency;
}

/** e.g. "1,800 SAR" / "1,800 ر.س"; shows halalas only when present. */
export function formatMoney(value: number, currency: string, language: string) {
  return `${formatNumber(value, language, 2)} ${currencyLabel(currency, language)}`;
}
