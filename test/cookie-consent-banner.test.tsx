import type { ReactNode } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";
import { renderWithIntl } from "@/test/utils/render-with-intl";

vi.mock("next/script", () => ({
  default: ({
    children,
    id,
    src,
  }: {
    children?: ReactNode;
    id?: string;
    src?: string;
  }) => (
    <div id={id} data-src={src}>
      {children}
    </div>
  ),
}));

const clearConsentCookie = () => {
  document.cookie = "logr_cookie_consent=; Max-Age=0; Path=/";
};

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    clearConsentCookie();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ANALYTICS_ID", "G-TEST123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearConsentCookie();
  });

  it("asks for consent when no preference is stored", async () => {
    renderWithIntl(<CookieConsentBanner />);

    expect(await screen.findByRole("complementary", { name: "Cookie consent" })).toBeInTheDocument();
    expect(document.querySelector("#google-analytics-script")).not.toBeInTheDocument();
  });

  it("loads Google Analytics after accepting analytics cookies", async () => {
    renderWithIntl(<CookieConsentBanner />);

    fireEvent.click(await screen.findByRole("button", { name: "Accept analytics" }));

    await waitFor(() => {
      expect(document.cookie).toContain("logr_cookie_consent=accepted");
      expect(document.querySelector("#google-analytics-script")).toHaveAttribute(
        "data-src",
        "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
      );
    });
  });

  it("stores rejection without loading Google Analytics", async () => {
    renderWithIntl(<CookieConsentBanner />);

    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(document.cookie).toContain("logr_cookie_consent=rejected");
      expect(document.querySelector("#google-analytics-script")).not.toBeInTheDocument();
    });
  });
});
