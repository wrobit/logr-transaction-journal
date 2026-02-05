"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

import { OauthButtons } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const labelClassName = "text-xs text-muted-foreground";
  const inputClassName =
    "border-border bg-background text-sm text-foreground placeholder:text-muted-foreground";

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
      setError(data.error ?? t("registerError"));
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
      setError(t("registerSignInError"));
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold">{t("registerTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("registerSubtitle")}
        </p>
      </div>

      <OauthButtons />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1 bg-border" />
        <span>{t("orSignUpEmail")}</span>
        <Separator className="flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName" className={labelClassName}>
              {t("firstName")}
            </Label>
            <Input
              id="firstName"
              name="firstName"
              required
              className={inputClassName}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className={labelClassName}>
              {t("lastName")}
            </Label>
            <Input
              id="lastName"
              name="lastName"
              required
              className={inputClassName}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="login" className={labelClassName}>
            {t("login")}
          </Label>
          <Input
            id="login"
            name="login"
            autoComplete="username"
            required
            className={inputClassName}
            placeholder="entry-user"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={labelClassName}>
            {t("email")}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClassName}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={labelClassName}>
            {t("password")}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className={inputClassName}
            placeholder="••••••••"
          />
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <Button
          type="submit"
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? t("creatingAccount") : t("createAccount")}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {t("hasAccount")} {" "}
        <Link href="/login" className="text-foreground hover:text-foreground">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
