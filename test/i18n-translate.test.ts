// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.hoisted(() => vi.fn());
const getLocaleMessagesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/i18n/messages", () => ({
  getLocaleMessages: getLocaleMessagesMock,
}));

import { getServerTranslator } from "@/lib/i18n/translate";

describe("getServerTranslator", () => {
  beforeEach(() => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: "pl" }) });
    getLocaleMessagesMock.mockImplementation(async (locale: string) => {
      if (locale === "pl") {
        return { profile: {} };
      }
      return { profile: { title: "Profile" } };
    });
  });

  it("falls back to default locale key when missing", async () => {
    const t = await getServerTranslator();
    expect(t("profile.title")).toBe("Profile");
  });
});
