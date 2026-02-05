"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { APP_LOCALES, type AppLocale } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("common");

  const updateLocale = async (nextLocale: AppLocale) => {
    if (nextLocale === locale) {
      return;
    }

    await fetch("/api/locale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale: nextLocale }),
    });

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2" role="group" aria-label={t("localeLabel")}>
      {APP_LOCALES.map((option) => {
        const isActive = option === locale;
        return (
          <Button
            key={option}
            type="button"
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            className="h-7 min-w-10 px-2 text-[11px] uppercase"
            disabled={isPending || isActive}
            onClick={() => void updateLocale(option)}
            aria-pressed={isActive}
          >
            {option}
          </Button>
        );
      })}
    </div>
  );
}
