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
        className="w-full cursor-pointer justify-center gap-2 border-neutral-800 bg-neutral-950 text-neutral-100 hover:border-neutral-700 hover:bg-neutral-900 hover:text-white"
        onClick={() => signIn("google", { callbackUrl: CALLBACK_URL })}
      >
        <Chrome className="size-4" />
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer justify-center gap-2 border-neutral-800 bg-neutral-950 text-neutral-100 hover:border-neutral-700 hover:bg-neutral-900 hover:text-white"
        onClick={() => signIn("github", { callbackUrl: CALLBACK_URL })}
      >
        <Github className="size-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
