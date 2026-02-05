"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { UserIcon } from "lucide-react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const t = useTranslations("nav");

  return (
    <header className="border-b border-border bg-background/90 px-6 py-4 text-foreground backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Entry"
              width={120}
              height={32}
              className="h-6 w-auto opacity-90 dark:invert"
              priority
            />
          </Link>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/" className="transition hover:text-foreground">
              {t("entries")}
            </Link>
            <Link href="/dashboard" className="transition hover:text-foreground">
              {t("dashboard")}
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="transition hover:text-foreground">
                {t("admin")}
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-border text-muted-foreground hover:bg-muted"
              >
                <UserIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 border border-border bg-popover text-popover-foreground shadow-xl"
            >
              <DropdownMenuItem className="text-muted-foreground" asChild>
                <Link href="/profile">{t("profile")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10"
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
