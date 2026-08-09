import type { MetadataRoute } from "next";

import { getSiteUrl, isProduction } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: isProduction ? "/" : undefined,
        disallow: isProduction ? ["/admin/", "/api/"] : "/",
      },
    ],
    sitemap: isProduction ? `${getSiteUrl()}/sitemap.xml` : undefined,
    host: isProduction ? getSiteUrl() : undefined,
  };
}
