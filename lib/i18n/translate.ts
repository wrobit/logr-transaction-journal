import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isAppLocale,
  type AppLocale,
} from "@/lib/i18n/config";
import { getLocaleMessages } from "@/lib/i18n/messages";

function getByPath(input: unknown, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null || !(key in value)) {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, input);
}

function formatTemplate(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, token: string) => {
    const value = values[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return isAppLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
}

export async function getServerTranslator(locale?: AppLocale) {
  const resolvedLocale = locale ?? (await getRequestLocale());
  const messages = await getLocaleMessages(resolvedLocale);
  const fallbackMessages = resolvedLocale === DEFAULT_LOCALE ? messages : await getLocaleMessages(DEFAULT_LOCALE);

  return (key: string, values?: Record<string, string | number>) => {
    const localized = getByPath(messages, key);
    if (typeof localized === "string") {
      return formatTemplate(localized, values);
    }

    const fallback = getByPath(fallbackMessages, key);
    if (typeof fallback === "string") {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Missing translation key \"${key}\" for locale \"${resolvedLocale}\".`);
      }
      return formatTemplate(fallback, values);
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(`Missing translation key \"${key}\" in locale and fallback catalogs.`);
    }

    return key;
  };
}
