"use client";

import { usePathname } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = !AUTH_ROUTES.has(pathname);

  if (!showShell) {
    return <div className="min-h-screen bg-black">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-black text-foreground">
      <div className="flex min-h-screen flex-col md:flex-row">
        <div className="flex min-h-screen flex-1 flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
