import { cookies } from "next/headers";
import type { Account, NextAuthOptions, Profile } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import { SIGNUP_INTENT_COOKIE, verifySignupIntent } from "@/lib/auth/signup-intent";
import { isPublicRegistrationEnabled } from "@/lib/auth/registration";
import {
  createOauthUser,
  getUserById,
  getUserByOauthAccount,
  normalizeEmail,
  updateUserLoginMetadata,
} from "@/lib/auth/users";
import { checkRateLimit } from "@/lib/security/rate-limit";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type GoogleProfile = Profile & { email?: string; email_verified?: boolean };
type GithubEmail = { email?: string; primary?: boolean; verified?: boolean };

async function getVerifiedProviderEmail(
  provider: string,
  profile: Profile | undefined,
  account: Account,
) {
  if (provider === "google") {
    const googleProfile = profile as GoogleProfile | undefined;
    return googleProfile?.email_verified && googleProfile.email
      ? normalizeEmail(googleProfile.email)
      : null;
  }

  if (provider === "github" && account.access_token) {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${account.access_token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const emails = (await response.json().catch(() => [])) as GithubEmail[];
    const verified = emails.find((email) => email.primary && email.verified && email.email);
    return verified?.email ? normalizeEmail(verified.email) : null;
  }

  return null;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account?.providerAccountId || !["google", "github"].includes(account.provider)) {
        return false;
      }

      const rateLimit = await checkRateLimit(
        "oauthAccount",
        `${account.provider}:${account.providerAccountId}`,
      );
      if (!rateLimit.success) {
        return false;
      }

      const existing = await getUserByOauthAccount(account.provider, account.providerAccountId);
      if (existing) {
        await updateUserLoginMetadata({
          userId: existing.user.id,
          email: existing.user.email,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });
        return true;
      }

      if (!isPublicRegistrationEnabled()) {
        return false;
      }

      const cookieStore = await cookies();
      const intent = cookieStore.get(SIGNUP_INTENT_COOKIE)?.value;
      if (!verifySignupIntent(intent, account.provider)) {
        return false;
      }
      cookieStore.delete(SIGNUP_INTENT_COOKIE);

      const verifiedEmail = await getVerifiedProviderEmail(account.provider, profile, account);
      if (!verifiedEmail) {
        return false;
      }

      try {
        await createOauthUser({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: verifiedEmail,
          name: user.name,
        });
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        const linked = await getUserByOauthAccount(account.provider, account.providerAccountId);
        if (linked) {
          token.userId = linked.user.id;
          token.role = linked.user.role;
          token.authenticatedAt = Date.now();
        }
      }

      if (token.userId) {
        const activeUser = await getUserById(String(token.userId));
        if (!activeUser) {
          delete token.userId;
          delete token.role;
          delete token.authenticatedAt;
        } else {
          token.role = activeUser.role;
          token.email = activeUser.email;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = String(token.userId);
        session.user.role = token.role as "user" | "admin";
        session.user.authenticatedAt = Number(token.authenticatedAt ?? 0);
      } else {
        session.user.id = "";
        session.user.role = undefined;
        session.user.authenticatedAt = 0;
      }

      return session;
    },
  },
};
