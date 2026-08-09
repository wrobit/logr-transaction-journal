import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters = redis
  ? {
      signupIp: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "15 m"),
        prefix: "logr:signup:ip",
        analytics: true,
      }),
      oauthAccount: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "15 m"),
        prefix: "logr:oauth:account",
        analytics: true,
      }),
      oauthIp: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "15 m"),
        prefix: "logr:oauth:ip",
        analytics: true,
      }),
      expensiveAction: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "10 m"),
        prefix: "logr:expensive",
        analytics: true,
      }),
    }
  : null;

export type RateLimitScope = keyof NonNullable<typeof limiters>;

export async function checkRateLimit(scope: RateLimitScope, identifier: string) {
  if (!limiters) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, reason: "rate_limit_unavailable" as const };
    }

    return { success: true, reason: "development_bypass" as const };
  }

  try {
    const result = await limiters[scope].limit(identifier);
    return {
      success: result.success,
      reason: result.success ? "allowed" as const : "limited" as const,
      reset: result.reset,
    };
  } catch {
    return process.env.NODE_ENV === "production"
      ? { success: false, reason: "rate_limit_unavailable" as const }
      : { success: true, reason: "development_bypass" as const };
  }
}

export function getClientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? headers.get("x-real-ip")?.trim()
    ?? "unknown"
  );
}
