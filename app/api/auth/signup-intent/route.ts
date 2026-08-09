import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createSignupIntent,
  SIGNUP_INTENT_COOKIE,
  signupIntentCookieOptions,
} from "@/lib/auth/signup-intent";
import { isPublicRegistrationEnabled } from "@/lib/auth/registration";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const requestSchema = z.object({
  provider: z.enum(["google", "github"]),
  turnstileToken: z.string().min(1).max(4096),
});

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
};

export async function POST(request: Request) {
  if (!isPublicRegistrationEnabled()) {
    return NextResponse.json({ error: "Signup is temporarily unavailable." }, { status: 503 });
  }

  if (Number(request.headers.get("content-length") ?? 0) > 8_192) {
    return NextResponse.json({ error: "Invalid signup request." }, { status: 413 });
  }

  const ip = getClientIp(request.headers);
  const rateLimit = await checkRateLimit("signupIp", ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Signup is temporarily unavailable." }, { status: 429 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 8_192) {
    return NextResponse.json({ error: "Invalid signup request." }, { status: 413 });
  }

  const body = (() => {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
  })();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signup request." }, { status: 400 });
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Signup is temporarily unavailable." }, { status: 503 });
    }
  } else {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: parsed.data.turnstileToken,
        remoteip: ip,
      }),
      cache: "no-store",
    });
    const verification = (await response.json().catch(() => null)) as TurnstileResponse | null;
    const allowedHostnames = new Set(
      (process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? "")
        .split(",")
        .map((hostname) => hostname.trim().toLowerCase())
        .filter(Boolean),
    );
    const hostnameAllowed =
      allowedHostnames.size === 0
      || (verification?.hostname && allowedHostnames.has(verification.hostname.toLowerCase()));

    if (!response.ok || !verification?.success || !hostnameAllowed) {
      return NextResponse.json({ error: "Signup verification failed." }, { status: 400 });
    }
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: SIGNUP_INTENT_COOKIE,
    value: createSignupIntent(parsed.data.provider),
    ...signupIntentCookieOptions,
  });

  return NextResponse.json({ ok: true });
}
