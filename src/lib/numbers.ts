const ARABIC_INDIC = /[٠-٩۰-۹]/g;

/**
 * Parses user-typed numbers, accepting Arabic-Indic digits and the Arabic decimal separator.
 * Returns null for empty input and NaN for invalid input.
 */
export function parseNumber(input: string): number | null {
  const normalized = input
    .trim()
    // U+0660–0669 and U+06F0–06F9 both end in the digit's value.
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) & 0xf))
    .replace(/٫/g, '.')
    .replace(/[,٬\s]/g, '');
  if (!normalized) return null;
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}
