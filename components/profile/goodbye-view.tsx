"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function GoodbyeView() {
  return (
    <div className="space-y-8 text-foreground">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Account deleted</h1>
        <p className="text-sm text-muted-foreground">
          Your Entry profile and transactions are now removed.
        </p>
      </div>

      <section className="rounded-sm border border-border bg-muted/40 p-4">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">All set</h2>
          <p className="text-xs text-muted-foreground">
            Thanks for trying Entry. You can start fresh whenever you&apos;re ready.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="bg-foreground text-background hover:bg-foreground/90" asChild>
            <Link href="/register">Create new account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
