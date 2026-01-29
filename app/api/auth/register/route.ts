import { NextResponse } from "next/server";

import {
  createCredentialsUser,
  getUserByEmail,
  getUserByLogin,
} from "@/lib/auth/users";
import { registerSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration data" },
      { status: 400 },
    );
  }

  const existingEmail = await getUserByEmail(parsed.data.email);
  if (existingEmail) {
    return NextResponse.json(
      { error: "Email is already in use" },
      { status: 409 },
    );
  }

  const existingLogin = await getUserByLogin(parsed.data.login);
  if (existingLogin) {
    return NextResponse.json(
      { error: "Login is already in use" },
      { status: 409 },
    );
  }

  await createCredentialsUser(parsed.data);

  return NextResponse.json({ ok: true });
}
