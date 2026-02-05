"use client";

import { Chrome, Github } from "lucide-react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

const CALLBACK_URL = "/";

export function OauthButtons() {
  const t = useTranslations("auth");

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer justify-center gap-2 border-border bg-background text-foreground hover:bg-muted"
        onClick={() => signIn("google", { callbackUrl: CALLBACK_URL })}
      >
        <Chrome className="size-4" />
        {t("oauthGoogle")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer justify-center gap-2 border-border bg-background text-foreground hover:bg-muted"
        onClick={() => signIn("github", { callbackUrl: CALLBACK_URL })}
      >
        <Github className="size-4" />
        {t("oauthGithub")}
      </Button>
    </div>
  );
}
