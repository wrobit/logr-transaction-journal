"use client";

import Image from "next/image";
import Link from "next/link";
import { Coffee, Github, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

const contactEmail = "piotr.wrobel@quadrantive.com";
const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL?.trim() || "https://github.com/wrobit";
const buyMeACoffeeUrl =
  process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL?.trim() || "https://buymeacoffee.com/wrobit";

const productLinks = [
  { href: "/", labelKey: "entries" },
  { href: "/dashboard", labelKey: "dashboard" },
  { href: "/profile", labelKey: "profile" },
] as const;

const socialLinks = [
  {
    href: githubUrl,
    labelKey: "github",
    icon: Github,
  },
  {
    href: buyMeACoffeeUrl,
    labelKey: "buyMeACoffee",
    icon: Coffee,
  },
  {
    href: `mailto:${contactEmail}`,
    labelKey: "email",
    icon: Mail,
  },
] as const;

export function AppFooter({ hasTicker = false }: { hasTicker?: boolean }) {
  const t = useTranslations("footer");

  return (
    <footer
      className={`border-t border-white/10 bg-neutral-950 px-4 pt-8 text-neutral-200 md:px-5 md:pt-10 ${
        hasTicker ? "pb-20" : "pb-8 md:pb-10"
      }`}
    >
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.6fr)_minmax(12rem,0.7fr)] md:gap-10">
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo.svg"
                alt="Logr"
                width={120}
                height={32}
                className="h-6 w-auto invert"
              />
            </Link>
            <p className="max-w-sm text-sm leading-6 text-neutral-400">{t("description")}</p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map(({ href, labelKey, icon: Icon }) => (
                <a
                  key={labelKey}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={href.startsWith("mailto:") ? undefined : "noreferrer noopener"}
                  aria-label={t(labelKey)}
                  className="flex size-9 items-center justify-center rounded-full bg-white text-neutral-950 transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <nav className="space-y-4" aria-label={t("pages")}>
            <h2 className="text-sm font-semibold text-neutral-100">{t("pages")}</h2>
            <div className="flex flex-col items-start gap-3 text-sm text-neutral-400">
              {productLinks.map(({ href, labelKey }) => (
                <Link key={href} href={href} className="transition hover:text-neutral-100">
                  {t(labelKey)}
                </Link>
              ))}
            </div>
          </nav>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-neutral-100">{t("contact")}</h2>
            <div className="space-y-3 text-sm text-neutral-400">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-2 transition hover:text-neutral-100"
              >
                <Mail className="size-4" aria-hidden="true" />
                {contactEmail}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
