"use client";

import { Chrome, Github } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

const CALLBACK_URL = "/";

export function OauthButtons() {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer justify-center gap-2 border-border bg-background text-foreground hover:bg-muted"
        onClick={() => signIn("google", { callbackUrl: CALLBACK_URL })}
      >
        <Chrome className="size-4" />
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer justify-center gap-2 border-border bg-background text-foreground hover:bg-muted"
        onClick={() => signIn("github", { callbackUrl: CALLBACK_URL })}
      >
        <Github className="size-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
