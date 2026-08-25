import { z } from "zod";

const base64KeySchema = z.string().refine((value) => {
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}, "must be a 32-byte base64 key");

const productionEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENTRY_KEK: base64KeySchema,
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_ID: z.string().min(1),
  GITHUB_SECRET: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_ALLOWED_HOSTNAMES: z.string().min(1),
  PUBLIC_REGISTRATION_ENABLED: z.enum(["true", "false"]),
});

export function validateProductionEnvironment() {
  if (process.env.VERCEL_ENV !== "production") {
    return;
  }

  const parsed = productionEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid production environment variables: ${fields}`);
  }
}
