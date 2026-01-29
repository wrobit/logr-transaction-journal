"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { OauthButtons } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold">Welcome to Entry</h1>
        <p className="text-sm text-neutral-400">
          Minimal crypto journaling for accurate tracking.
        </p>
      </div>

      <OauthButtons />

      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <Separator className="flex-1 bg-neutral-800" />
        <span>or continue with email</span>
        <Separator className="flex-1 bg-neutral-800" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs text-neutral-300">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="border-neutral-800 bg-neutral-950 text-sm text-white placeholder:text-neutral-600"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs text-neutral-300">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="border-neutral-800 bg-neutral-950 text-sm text-white placeholder:text-neutral-600"
            placeholder="••••••••"
          />
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <Button
          type="submit"
          className="w-full bg-white text-black hover:bg-neutral-200"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Continue"}
        </Button>
      </form>

      <p className="text-center text-xs text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-neutral-200 hover:text-white">
          Register
        </Link>
      </p>
    </div>
  );
}
