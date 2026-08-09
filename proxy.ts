import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const protectedProxy = withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ token, req }) {
      if (!token) {
        return false;
      }

      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token.role === "admin";
      }

      return true;
    },
  },
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/auth/signin/") || pathname.startsWith("/api/auth/callback/")) {
    const rateLimit = await checkRateLimit("oauthIp", getClientIp(request.headers));
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable." },
        { status: 429 },
      );
    }

    return NextResponse.next();
  }

  return protectedProxy(request as NextRequestWithAuth, event);
}

export const config = {
  matcher: [
    "/",
    "/summary",
    "/profile",
    "/dashboard",
    "/admin/:path*",
    "/api/auth/signin/:path*",
    "/api/auth/callback/:path*",
  ],
};
