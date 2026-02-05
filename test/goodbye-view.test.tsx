import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GoodbyeView } from "@/components/profile/goodbye-view";
import { renderWithIntl } from "@/test/utils/render-with-intl";

describe("GoodbyeView", () => {
  it("renders confirmation copy and CTAs", () => {
    renderWithIntl(<GoodbyeView />);

    expect(screen.getByText("Account deleted")).toBeInTheDocument();
    expect(screen.getByText("All set")).toBeInTheDocument();
    expect(screen.getByText("Create new account")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });
});
