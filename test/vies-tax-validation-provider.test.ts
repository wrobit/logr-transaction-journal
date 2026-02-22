import { describe, expect, it, vi } from "vitest";

import { ViesTaxValidationProvider } from "@/lib/integrations/providers/vies-tax-validation-provider";

describe("VIES tax validation provider", () => {
  it("returns valid when VIES response contains valid true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "<valid>true</valid>",
    }));

    const provider = new ViesTaxValidationProvider();
    const result = await provider.validate({
      countryCode: "DE",
      idType: "vat",
      value: "DE123456789",
    });

    expect(result.status).toBe("valid");
  });

  it("returns unavailable when endpoint is non-200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "",
    }));

    const provider = new ViesTaxValidationProvider();
    const result = await provider.validate({
      countryCode: "DE",
      idType: "vat",
      value: "DE123456789",
    });

    expect(result.status).toBe("unavailable");
  });
});
