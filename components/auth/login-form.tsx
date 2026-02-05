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

export function LoginForm() {
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
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    if (result?.error) {
      setError(t("loginError"));
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("loginSubtitle")}
        </p>
      </div>

      <OauthButtons />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1 bg-border" />
        <span>{t("orContinueEmail")}</span>
        <Separator className="flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
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
          {isSubmitting ? t("signingIn") : t("continue")}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {t("noAccount")} {" "}
        <Link href="/register" className="text-foreground hover:text-foreground">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}
