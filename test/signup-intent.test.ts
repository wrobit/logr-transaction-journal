// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSignupIntent, verifySignupIntent } from "@/lib/auth/signup-intent";

describe("OAuth signup intent", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-that-is-long-enough-for-signing";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts the intended provider during the short validity window", () => {
    const intent = createSignupIntent("google");
    expect(verifySignupIntent(intent, "google")).toBe(true);
    expect(verifySignupIntent(intent, "github")).toBe(false);
  });

  it("rejects tampered and expired intents", () => {
    const intent = createSignupIntent("github");
    expect(verifySignupIntent(`${intent}x`, "github")).toBe(false);

    vi.advanceTimersByTime(11 * 60_000);
    expect(verifySignupIntent(intent, "github")).toBe(false);
  });
});
