import { DEFAULT_LOCALE, toIntlLocale } from "@/lib/i18n/config";

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: string = DEFAULT_LOCALE,
) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    maximumFractionDigits: 12,
    ...options,
  }).format(value);
}

export function formatPln(value: number, locale: string = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
