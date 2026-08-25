import { withAuth } from "next-auth/middleware";

export default withAuth({
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

export const config = {
  matcher: ["/", "/summary", "/profile", "/dashboard", "/admin/:path*"],
};
