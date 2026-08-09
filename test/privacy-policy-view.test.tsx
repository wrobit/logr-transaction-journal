import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrivacyPolicyView } from "@/components/legal/privacy-policy-view";
import { renderWithIntl } from "@/test/utils/render-with-intl";

describe("PrivacyPolicyView", () => {
  it("renders controller and processing sections", () => {
    renderWithIntl(<PrivacyPolicyView />);

    expect(
      screen.getByRole("heading", { name: "Privacy policy" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/controller of personal data/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Piotr Wrobel/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Cookies and analytics" })).toBeInTheDocument();
    expect(screen.getByText(/Google Analytics script is not loaded/i)).toBeInTheDocument();
  });
});
