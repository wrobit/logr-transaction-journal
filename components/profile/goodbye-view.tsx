"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function GoodbyeView() {
  const t = useTranslations("profile.goodbye");

  return (
    <div className="space-y-8 text-foreground">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="rounded-sm border border-border bg-muted/40 p-4">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t("allSet")}</h2>
          <p className="text-xs text-muted-foreground">{t("allSetSubtitle")}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="bg-foreground text-background hover:bg-foreground/90" asChild>
            <Link href="/register">{t("createNew")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
