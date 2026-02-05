import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isAppLocale } from "@/lib/i18n/config";

const requestSchema = z.object({ locale: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success || !isAppLocale(parsed.data.locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: LOCALE_COOKIE_NAME,
    value: parsed.data.locale,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ locale: parsed.data.locale ?? DEFAULT_LOCALE });
}
