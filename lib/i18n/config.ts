export const APP_LOCALES = ["en", "pl"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE_NAME = "logr-locale";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  if (!value) {
    return false;
  }

  return APP_LOCALES.includes(value as AppLocale);
}

export function toIntlLocale(locale: string) {
  return locale === "pl" ? "pl-PL" : "en-US";
}
