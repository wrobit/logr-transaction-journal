"use client";

import { useState } from "react";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

import { OauthButtons, type OAuthProvider } from "@/components/auth/oauth-buttons";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

export function RegisterForm() {
  const t = useTranslations("auth");
  const [turnstileToken, setTurnstileToken] = useState(
    turnstileSiteKey ? "" : "development-bypass",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startSignup = async (provider: OAuthProvider) => {
    if (!turnstileToken) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const response = await fetch("/api/auth/signup-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, turnstileToken }),
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

      {turnstileSiteKey ? (
        <div className="flex justify-center">
          <Turnstile
            siteKey={turnstileSiteKey}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
            onError={() => setTurnstileToken("")}
            options={{ theme: "auto" }}
          />
        </div>
      ) : null}

      <OauthButtons
        disabled={!turnstileToken || isSubmitting}
        onProviderClick={startSignup}
      />

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
