"use client";

import { Chrome, Github } from "lucide-react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

const CALLBACK_URL = "/";
export type OAuthProvider = "google" | "github";

type OauthButtonsProps = {
  disabled?: boolean;
  onProviderClick?: (provider: OAuthProvider) => Promise<void>;
};

export function OauthButtons({ disabled = false, onProviderClick }: OauthButtonsProps) {
  const t = useTranslations("auth");

  const startSignIn = async (provider: OAuthProvider) => {
    if (onProviderClick) {
      await onProviderClick(provider);
      return;
    }

    await signIn(provider, { callbackUrl: CALLBACK_URL });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer justify-center gap-2 border-border bg-background text-foreground hover:bg-muted"
        disabled={disabled}
        onClick={() => startSignIn("google")}
      >
        <Chrome className="size-4" />
        {t("oauthGoogle")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer justify-center gap-2 border-border bg-background text-foreground hover:bg-muted"
        disabled={disabled}
        onClick={() => startSignIn("github")}
      >
        <Github className="size-4" />
        {t("oauthGithub")}
      </Button>
    </div>
  );
}
