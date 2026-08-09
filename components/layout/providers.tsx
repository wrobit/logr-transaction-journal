"use client";

import type { Session } from "next-auth";
import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";
import type { CookieConsentValue } from "@/lib/privacy/consent";

export function Providers({
  children,
  initialCookieConsent,
  locale,
  messages,
  session,
}: {
  children: React.ReactNode;
  initialCookieConsent: CookieConsentValue | null;
  locale: string;
  messages: AbstractIntlMessages;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        <Toaster
          position="top-right"
          toastOptions={{
            className: "border border-neutral-800 bg-neutral-950 text-sm text-white",
          }}
        />
        {children}
        <CookieConsentBanner initialConsent={initialCookieConsent} />
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
