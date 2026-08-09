"use client";

import Script from "next/script";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type GoogleAnalyticsProps = {
  measurementId: string;
};

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const trimmedMeasurementId = measurementId.trim();
  const measurementIdLiteral = JSON.stringify(trimmedMeasurementId);

  if (!trimmedMeasurementId) {
    return null;
  }

  return (
    <>
      <Script
        id="google-analytics-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trimmedMeasurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', ${measurementIdLiteral}, { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
