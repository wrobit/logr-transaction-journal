import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createSignupIntent,
  SIGNUP_INTENT_COOKIE,
  signupIntentCookieOptions,
} from "@/lib/auth/signup-intent";
import { isPublicRegistrationEnabled } from "@/lib/auth/registration";

const requestSchema = z.object({
  provider: z.enum(["google", "github"]),
});

export async function POST(request: Request) {
  if (!isPublicRegistrationEnabled()) {
    return NextResponse.json({ error: "Signup is temporarily unavailable." }, { status: 503 });
  }

  if (Number(request.headers.get("content-length") ?? 0) > 8_192) {
    return NextResponse.json({ error: "Invalid signup request." }, { status: 413 });
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

  const cookieStore = await cookies();
  cookieStore.set({
    name: SIGNUP_INTENT_COOKIE,
    value: createSignupIntent(parsed.data.provider),
    ...signupIntentCookieOptions,
  });

  return NextResponse.json({ ok: true });
}
