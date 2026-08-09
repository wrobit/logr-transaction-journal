import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SIGNUP_INTENT_COOKIE = "logr.signup-intent";
const INTENT_TTL_SECONDS = 10 * 60;

type SignupIntent = {
  provider: "google" | "github";
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function getSigningSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required to sign signup intents.");
  }

  return secret;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSigningSecret()).update(encodedPayload).digest("base64url");
}

export function createSignupIntent(provider: SignupIntent["provider"]) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SignupIntent = {
    provider,
    issuedAt,
    expiresAt: issuedAt + INTENT_TTL_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySignupIntent(value: string | undefined, provider: string) {
  if (!value) {
    return false;
  }

  const [encodedPayload, providedSignature] = value.split(".");
  if (!encodedPayload || !providedSignature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SignupIntent;
    const now = Math.floor(Date.now() / 1000);
    return payload.provider === provider && payload.expiresAt >= now && payload.issuedAt <= now;
  } catch {
    return false;
  }
}

export const signupIntentCookieOptions = {
  httpOnly: true,
  maxAge: INTENT_TTL_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
