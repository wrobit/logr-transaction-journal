// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    cookiesMock.mockResolvedValue({ get: () => ({ value: "pl" }) });
    getLocaleMessagesMock.mockImplementation(async (locale: string) => {
      if (locale === "pl") {
        return { profile: { title: "Profil" } };
      }
      return { profile: { title: "Profile", subtitle: "Manage your account" } };
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("falls back to default locale key when missing", async () => {
    const t = await getServerTranslator();
    expect(t("profile.subtitle")).toBe("Manage your account");
  });
});
