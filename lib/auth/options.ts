import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import { verifyPassword } from "@/lib/auth/password";
import {
  createOauthUser,
  getUserByEmail,
  getUserById,
  updateUserLoginMetadata,
} from "@/lib/auth/users";
import { credentialsSchema } from "@/lib/auth/validation";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await getUserByEmail(parsed.data.email);
        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) {
        return false;
      }

      let dbUser = await getUserByEmail(user.email);

      if (!dbUser && account?.provider !== "credentials") {
        dbUser = await createOauthUser({ email: user.email, name: user.name });
      }

      if (dbUser) {
        await updateUserLoginMetadata({
          userId: dbUser.id,
          email: dbUser.email,
        });
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "credentials") {
          token.userId = user.id;
          token.role = "role" in user ? (user.role as "user" | "admin" | undefined) : undefined;
          return token;
        }

        if (user.email) {
          const dbUser = await getUserByEmail(user.email);
          if (dbUser) {
            token.userId = dbUser.id;
            token.role = dbUser.role;
          }
        }
      }

      if (!token.userId && token.email) {
        const dbUser = await getUserByEmail(token.email);
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }

      if (token.userId && !token.role) {
        const dbUser = await getUserById(token.userId as string);
        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }

      if (session.user && token.role) {
        session.user.role = token.role as "user" | "admin";
      }

      return session;
    },
  },
};
