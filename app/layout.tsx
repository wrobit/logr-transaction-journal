import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import { getServerSession } from "next-auth";

import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/layout/providers";
import { FooterTicker } from "@/components/ticker/footer-ticker";
import { authOptions } from "@/lib/auth/options";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isAppLocale } from "@/lib/i18n/config";
import { getLocaleMessages } from "@/lib/i18n/messages";
import { getServerTranslator } from "@/lib/i18n/translate";
import {
  appTagline,
  appTitle,
  buildPageMetadata,
  metadataBase,
} from "@/lib/metadata";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  const description = t("metadata.root.description");
  const rootMetadata = buildPageMetadata({
    title: appTitle,
    description,
    path: "/",
  });

  return {
    ...rootMetadata,
    metadataBase,
    title: {
      default: `Logr - ${appTagline}`,
      template: "Logr - %s",
    },
    applicationName: appTitle,
    authors: [{ name: appTitle }],
    keywords: ["crypto journal", "transaction ledger", "NBP rates", "PLN valuation", "accounting"],
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: ["/favicon.ico"],
      apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }],
    },
    manifest: "/site.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isAppLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const messages = await getLocaleMessages(locale);

  const session = await getServerSession(authOptions);
  const showTicker = Boolean(session?.user?.id);

  return (
    <html lang={locale} className={`${figtree.variable} dark`}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers session={session} locale={locale} messages={messages}>
          <AppShell showTicker={showTicker}>{children}</AppShell>
        </Providers>
        {showTicker ? <FooterTicker /> : null}
      </body>
    </html>
  );
}
