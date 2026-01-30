"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  return (
    <header className="border-b border-neutral-900 bg-neutral-950/90 px-6 py-4 text-white backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Entry"
              width={120}
              height={32}
              className="h-6 w-auto opacity-90 invert"
              priority
            />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-neutral-800 text-neutral-300 hover:bg-neutral-900/60"
              >
                <UserIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-xl"
            >
              <DropdownMenuItem
                className="text-neutral-200 focus:bg-neutral-900 focus:text-white"
                asChild
              >
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem
                className="text-red-300 focus:bg-red-500/10 focus:text-red-200"
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
