// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const importMetadata = async () => {
  vi.resetModules();
  return import("@/lib/metadata");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("production metadata helpers", () => {
  it("normalizes production metadata base from the public site URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "logr.example.com/");

    const { metadataBase } = await importMetadata();

    expect(metadataBase.toString()).toBe("https://logr.example.com/");
  });

  it("falls back to the local development URL when no host is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    const { metadataBase } = await importMetadata();

    expect(metadataBase.toString()).toBe("http://localhost:2206/");
  });

  it("builds canonical URLs and complete social tags for public pages", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { buildPageMetadata, ogImagePath } = await importMetadata();

    const metadata = buildPageMetadata({
      title: "Login",
      description: "Sign in to access Logr.",
      path: "/login/",
      index: true,
    });

    expect(metadata.alternates).toEqual({ canonical: "/login" });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      title: "Logr - Login",
      description: "Sign in to access Logr.",
      url: "/login",
      siteName: "Logr",
      type: "website",
    });
    expect(metadata.openGraph?.images).toEqual([
      {
        url: ogImagePath,
        width: 1200,
        height: 630,
        alt: "Logr encrypted crypto transaction journal",
      },
    ]);
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Logr - Login",
      description: "Sign in to access Logr.",
      images: [ogImagePath],
    });
  });

  it("keeps protected page metadata out of search results", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { buildPageMetadata } = await importMetadata();

    const metadata = buildPageMetadata({
      title: "Dashboard",
      description: "Track performance.",
      path: "/dashboard",
    });

    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});

describe("metadata routes", () => {
  it("generates a public production sitemap for indexable routes only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://logr.example.com");
    vi.resetModules();
    const { default: sitemap } = await import("@/app/sitemap");

    expect(sitemap()).toEqual([
      expect.objectContaining({ url: "https://logr.example.com/login" }),
      expect.objectContaining({ url: "https://logr.example.com/register" }),
    ]);
  });

  it("allows public crawling in production while blocking admin and API routes", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://logr.example.com");
    vi.resetModules();
    const { default: robots } = await import("@/app/robots");

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin/", "/api/"],
        },
      ],
      sitemap: "https://logr.example.com/sitemap.xml",
      host: "https://logr.example.com",
    });
  });
});
