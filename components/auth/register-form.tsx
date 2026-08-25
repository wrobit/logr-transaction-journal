"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

import { OauthButtons, type OAuthProvider } from "@/components/auth/oauth-buttons";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startSignup = async (provider: OAuthProvider) => {
    setError(null);
    setIsSubmitting(true);
    const response = await fetch("/api/auth/signup-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });

    if (!response.ok) {
      setError(t("registerError"));
      setIsSubmitting(false);
      return;
    }

    await signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold">{t("registerTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("registerSubtitle")}</p>
      </div>

      <OauthButtons disabled={isSubmitting} onProviderClick={startSignup} />

      {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}

      <p className="text-center text-xs text-muted-foreground">
        {t("hasAccount")} {" "}
        <Link href="/login" className="text-foreground hover:text-foreground">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
