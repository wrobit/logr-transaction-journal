import type { AbstractIntlMessages } from "next-intl";

import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/config";

const localeMessagesLoaders: Record<AppLocale, () => Promise<AbstractIntlMessages>> = {
  en: () => import("@/messages/en.json").then((module) => module.default),
  pl: () => import("@/messages/pl.json").then((module) => module.default),
};

export async function getLocaleMessages(locale: AppLocale) {
  const loader = localeMessagesLoaders[locale] ?? localeMessagesLoaders[DEFAULT_LOCALE];
  return loader();
}
