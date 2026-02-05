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

const appTitle = "Logr";
const appTagline = "The best minimalistic encrypted crypto journal";
const appDescription =
  "The best minimalistic encrypted crypto journal with PLN valuation via NBP rates.";
const isProduction = process.env.NODE_ENV === "production";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: `Logr - ${appTagline}`,
    template: "Logr - %s",
  },
  description: appDescription,
  applicationName: appTitle,
  authors: [{ name: appTitle }],
  keywords: ["crypto journal", "transaction ledger", "NBP rates", "PLN valuation", "accounting"],
  robots: {
    index: isProduction,
    follow: isProduction,
  },
  openGraph: {
    title: `Logr - ${appTagline}`,
    description: appDescription,
    siteName: appTitle,
    type: "website",
    images: [
      {
        url: "/og-placeholder.svg",
        width: 1200,
        height: 630,
        alt: "Logr crypto journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Logr - ${appTagline}`,
    description: appDescription,
    images: ["/og-placeholder.svg"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/site.webmanifest",
};

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
