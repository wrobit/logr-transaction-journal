"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { labelKey: "overview", href: "/admin" },
  { labelKey: "users", href: "/admin/users" },
  { labelKey: "feedback", href: "/admin/feedback" },
  { labelKey: "audit", href: "/admin/audit" },
  { labelKey: "integrations", href: "/admin/integrations" },
];

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");

  return (
    <nav className="flex flex-wrap gap-2 text-xs">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-sm border border-border px-3 py-1.5 text-muted-foreground transition",
              isActive ? "bg-muted/60 text-foreground" : "hover:text-foreground",
            )}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
