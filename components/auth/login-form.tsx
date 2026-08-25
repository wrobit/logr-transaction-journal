"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { OauthButtons } from "@/components/auth/oauth-buttons";

export function LoginForm() {
  const t = useTranslations("auth");

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      <OauthButtons />

      <p className="text-center text-xs text-muted-foreground">
        {t("noAccount")} {" "}
        <Link href="/register" className="text-foreground hover:text-foreground">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}
