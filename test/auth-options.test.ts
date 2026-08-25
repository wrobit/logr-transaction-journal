// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "next-auth";

import { authOptions } from "@/lib/auth/options";

const getUserByOauthAccountMock = vi.hoisted(() => vi.fn());
const getUserByIdMock = vi.hoisted(() => vi.fn());
const claimLegacyOauthUserMock = vi.hoisted(() => vi.fn());
const createOauthUserMock = vi.hoisted(() => vi.fn());
const updateUserLoginMetadataMock = vi.hoisted(() => vi.fn());
const cookieDeleteMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: "valid-intent" })),
    delete: cookieDeleteMock,
  })),
}));
vi.mock("@/lib/auth/signup-intent", () => ({
  SIGNUP_INTENT_COOKIE: "logr.signup-intent",
  verifySignupIntent: vi.fn(() => true),
}));
vi.mock("@/lib/auth/registration", () => ({ isPublicRegistrationEnabled: vi.fn(() => true) }));
vi.mock("@/lib/auth/users", () => ({
  claimLegacyOauthUser: claimLegacyOauthUserMock,
  createOauthUser: createOauthUserMock,
  getUserById: getUserByIdMock,
  getUserByOauthAccount: getUserByOauthAccountMock,
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  updateUserLoginMetadata: updateUserLoginMetadataMock,
}));

const oauthAccount = {
  provider: "google",
  providerAccountId: "provider-1",
  type: "oauth" as const,
};
const googleProfile = (emailVerified: boolean): Profile & { email_verified: boolean } => ({
  sub: "provider-1",
  email: "person@example.com",
  email_verified: emailVerified,
});

describe("OAuth authorization callbacks", () => {
  beforeEach(() => {
    getUserByOauthAccountMock.mockReset();
    getUserByIdMock.mockReset();
    claimLegacyOauthUserMock.mockReset();
    claimLegacyOauthUserMock.mockResolvedValue(null);
    createOauthUserMock.mockReset();
    updateUserLoginMetadataMock.mockReset();
    cookieDeleteMock.mockReset();
  });

  it("allows a returning linked account without creating another user", async () => {
    getUserByOauthAccountMock.mockResolvedValue({
      user: { id: "user-1", email: "person@example.com", role: "user" },
      account: {},
    });

    const result = await authOptions.callbacks?.signIn?.({
      user: { id: "provider-1" },
      account: oauthAccount,
      profile: { sub: "provider-1" },
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(true);
    expect(updateUserLoginMetadataMock).toHaveBeenCalledOnce();
    expect(createOauthUserMock).not.toHaveBeenCalled();
  });

  it("links an existing pre-OAuth user after the provider verifies their email", async () => {
    getUserByOauthAccountMock.mockResolvedValue(null);
    claimLegacyOauthUserMock.mockResolvedValue({
      id: "user-1",
      email: "person@example.com",
      role: "user",
    });

    const result = await authOptions.callbacks?.signIn?.({
      user: { id: "provider-1", email: "person@example.com" },
      account: oauthAccount,
      profile: googleProfile(true),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(true);
    expect(claimLegacyOauthUserMock).toHaveBeenCalledWith({
      provider: "google",
      providerAccountId: "provider-1",
      email: "person@example.com",
    });
    expect(createOauthUserMock).not.toHaveBeenCalled();
  });

  it("rejects first-time Google signup without a verified email", async () => {
    getUserByOauthAccountMock.mockResolvedValue(null);

    const result = await authOptions.callbacks?.signIn?.({
      user: { id: "provider-1", email: "person@example.com" },
      account: oauthAccount,
      profile: googleProfile(false),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(false);
    expect(createOauthUserMock).not.toHaveBeenCalled();
  });

  it("returns a generic rejection when account creation detects a provider collision", async () => {
    getUserByOauthAccountMock.mockResolvedValue(null);
    createOauthUserMock.mockRejectedValue(new Error("collision"));

    const result = await authOptions.callbacks?.signIn?.({
      user: { id: "provider-1", email: "person@example.com" },
      account: oauthAccount,
      profile: googleProfile(true),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(false);
    expect(cookieDeleteMock).toHaveBeenCalledOnce();
  });

  it("returns a generic rejection when the account lookup fails", async () => {
    getUserByOauthAccountMock.mockRejectedValue(new Error("database unavailable\nquery details"));

    const result = await authOptions.callbacks?.signIn?.({
      user: { id: "provider-1" },
      account: oauthAccount,
      profile: googleProfile(true),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(false);
  });

  it("invalidates a deleted user and refreshes a demoted role from Postgres", async () => {
    getUserByIdMock.mockResolvedValueOnce(null);
    const deletedToken = await authOptions.callbacks?.jwt?.({
      token: { userId: "deleted", role: "admin", authenticatedAt: Date.now() },
      user: { id: "deleted" },
      account: null,
      profile: undefined,
      trigger: undefined,
      isNewUser: false,
      session: undefined,
    });
    expect(deletedToken?.userId).toBeUndefined();
    expect(deletedToken?.role).toBeUndefined();

    getUserByIdMock.mockResolvedValueOnce({ id: "user-1", role: "user", email: "x@example.com" });
    const demotedToken = await authOptions.callbacks?.jwt?.({
      token: { userId: "user-1", role: "admin", authenticatedAt: Date.now() },
      user: { id: "user-1" },
      account: null,
      profile: undefined,
      trigger: undefined,
      isNewUser: false,
      session: undefined,
    });
    expect(demotedToken?.role).toBe("user");
  });
});
