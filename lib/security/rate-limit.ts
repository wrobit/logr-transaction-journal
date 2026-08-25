import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const signupLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "logr:signup:ip",
    })
  : null;

export async function checkSignupRateLimit(identifier: string) {
  if (!signupLimiter) {
    return { success: process.env.NODE_ENV !== "production" };
  }

  try {
    const result = await signupLimiter.limit(identifier);
    return { success: result.success };
  } catch {
    return { success: process.env.NODE_ENV !== "production" };
  }
}

export function getClientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? headers.get("x-real-ip")?.trim()
    ?? "unknown"
  );
}
