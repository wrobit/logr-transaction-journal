import type { MetadataRoute } from "next";

import { getSiteUrl, isProduction } from "@/lib/metadata";

const publicRoutes = ["/login", "/register"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProduction) {
    return [];
  }

  const now = new Date();
  const siteUrl = getSiteUrl();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: route === "/register" ? 0.8 : 0.7,
  }));
}
