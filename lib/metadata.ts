import type { Metadata } from "next";

const localSiteUrl = "http://localhost:2206";

const productionUrlEnvKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

export const appTitle = "Logr";
export const appTagline = "The best minimalistic encrypted crypto journal";
export const isProduction = process.env.NODE_ENV === "production";
export const ogImagePath = "/og-image.svg";

const normalizeSiteUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const getSiteUrl = () => {
  for (const key of productionUrlEnvKeys) {
    const normalized = normalizeSiteUrl(process.env[key]);
    if (normalized) {
      return normalized;
    }
  }

  return localSiteUrl;
};

export const metadataBase = new URL(getSiteUrl());

export const canonicalPath = (path: string) => {
  if (path === "/") {
    return "/";
  }

  return `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};

export const publicRobots = {
  index: isProduction,
  follow: isProduction,
  googleBot: {
    index: isProduction,
    follow: isProduction,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
} satisfies Metadata["robots"];

export const privateRobots = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} satisfies Metadata["robots"];

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
};

export const buildPageMetadata = ({
  title,
  description,
  path,
  index = false,
}: BuildPageMetadataInput): Metadata => {
  const canonical = canonicalPath(path);
  const fullTitle = title === appTitle ? appTitle : `${appTitle} - ${title}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: index ? publicRobots : privateRobots,
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: appTitle,
      type: "website",
      images: [
        {
          url: ogImagePath,
          width: 1200,
          height: 630,
          alt: "Logr encrypted crypto transaction journal",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImagePath],
    },
  };
};
