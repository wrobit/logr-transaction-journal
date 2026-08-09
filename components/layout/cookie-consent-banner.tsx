"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { useTranslations } from "next-intl";

import { GoogleAnalytics } from "@/components/layout/google-analytics";
import { Button } from "@/components/ui/button";
import {
  cookieConsentAccepted,
  cookieConsentName,
  cookieConsentRejected,
  type CookieConsentValue,
} from "@/lib/privacy/consent";

const consentMaxAgeSeconds = 60 * 60 * 24 * 180;
const consentListeners = new Set<() => void>();

const readConsentCookie = () => {
  if (typeof document === "undefined") {
    return null;
  }

  const consentCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${cookieConsentName}=`));

  return consentCookie?.split("=")[1] ?? null;
};

const subscribeToConsent = (listener: () => void) => {
  consentListeners.add(listener);

  return () => {
    consentListeners.delete(listener);
  };
};

const notifyConsentListeners = () => {
  consentListeners.forEach((listener) => listener());
};

const writeConsentCookie = (value: CookieConsentValue) => {
  document.cookie = [
    `${cookieConsentName}=${value}`,
    "Path=/",
    `Max-Age=${consentMaxAgeSeconds}`,
    "SameSite=Lax",
  ].join("; ");
};

export function CookieConsentBanner({
  initialConsent = null,
}: {
  initialConsent?: CookieConsentValue | null;
}) {
  const t = useTranslations("cookieConsent");
  const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() ?? "";
  const consent = useSyncExternalStore(
    subscribeToConsent,
    readConsentCookie,
    () => initialConsent,
  );

  const handleConsent = (value: CookieConsentValue) => {
    writeConsentCookie(value);
    notifyConsentListeners();
  };

  const hasAccepted = consent === cookieConsentAccepted;
  const shouldShowBanner =
    consent !== cookieConsentAccepted && consent !== cookieConsentRejected;

  return (
    <>
      {hasAccepted ? <GoogleAnalytics measurementId={measurementId} /> : null}
      {shouldShowBanner ? (
        <aside
          className="fixed bottom-4 right-4 z-[60] w-[calc(100vw-2rem)] max-w-sm border border-border bg-neutral-950 p-4 text-foreground shadow-2xl shadow-black/40"
          aria-label={t("label")}
        >
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/40">
              <Cookie className="size-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">{t("title")}</h2>
                <p className="text-xs leading-5 text-muted-foreground">
                  {t("description")}{" "}
                  <Link href="/privacy-policy" className="text-foreground underline underline-offset-4">
                    {t("privacyLink")}
                  </Link>
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="sm"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => handleConsent(cookieConsentAccepted)}
                >
                  {t("accept")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleConsent(cookieConsentRejected)}
                >
                  {t("reject")}
                </Button>
              </div>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
