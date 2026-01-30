"use client";

import { usePathname } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !AUTH_ROUTES.has(pathname);

  return (
    <div className="min-h-screen bg-black">
      {showNav ? <Navbar /> : null}
      {children}
    </div>
  );
}
