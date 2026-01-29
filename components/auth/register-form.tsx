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

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      login: String(formData.get("login") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Unable to create account.");
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
      callbackUrl: "/",
    });

    if (signInResult?.error) {
      setError("Account created, but sign in failed.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold">Create your Entry account</h1>
        <p className="text-sm text-neutral-400">
          Start tracking transactions with clarity.
        </p>
      </div>

      <OauthButtons />

      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <Separator className="flex-1 bg-neutral-800" />
        <span>or sign up with email</span>
        <Separator className="flex-1 bg-neutral-800" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-xs text-neutral-300">
              First name
            </Label>
            <Input
              id="firstName"
              name="firstName"
              required
              className="border-neutral-800 bg-neutral-950 text-sm text-white placeholder:text-neutral-600"
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-xs text-neutral-300">
              Last name
            </Label>
            <Input
              id="lastName"
              name="lastName"
              required
              className="border-neutral-800 bg-neutral-950 text-sm text-white placeholder:text-neutral-600"
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="login" className="text-xs text-neutral-300">
            Login
          </Label>
          <Input
            id="login"
            name="login"
            autoComplete="username"
            required
            className="border-neutral-800 bg-neutral-950 text-sm text-white placeholder:text-neutral-600"
            placeholder="entry-user"
          />
        </div>

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
            autoComplete="new-password"
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-center text-xs text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="text-neutral-200 hover:text-white">
          Sign in
        </Link>
      </p>
    </div>
  );
}
