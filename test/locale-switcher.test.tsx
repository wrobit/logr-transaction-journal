import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => (key === "localeLabel" ? "Language" : key),
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("persists locale selection and refreshes route", async () => {
    render(<LocaleSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "pl" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/locale",
        expect.objectContaining({ method: "POST" }),
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
