import { describe, expect, it, vi } from "vitest";

import { BocRateProvider } from "@/lib/integrations/providers/boc-rate-provider";
import { EcbRateProvider } from "@/lib/integrations/providers/ecb-rate-provider";
import { HmrcRateProvider } from "@/lib/integrations/providers/hmrc-rate-provider";

describe("rate providers", () => {
  it("resolves cross-rate from ECB payload", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("D.USD.EUR")) {
        return {
          ok: true,
          json: async () => ({
            dataSets: [{ series: { "0": { observations: { "0": [0.9] } } } }],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          dataSets: [{ series: { "0": { observations: { "0": [0.22] } } } }],
        }),
      };
    });

    vi.stubGlobal("fetch", fetchMock);
    const provider = new EcbRateProvider();
    const result = await provider.getRate({
      baseCurrency: "USD",
      quoteCurrency: "PLN",
      effectiveDate: "2025-02-01",
      rateType: "historical",
    });

    expect(result?.rateValue).toBeCloseTo(4.0909, 3);
  });

  it("resolves HMRC monthly rate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        period: "2025-02",
        rates: [
          { currencyCode: "USD", rate: 1.25 },
          { currencyCode: "EUR", rate: 1.1 },
        ],
      }),
    }));

    const provider = new HmrcRateProvider();
    const result = await provider.getRate({
      baseCurrency: "USD",
      quoteCurrency: "EUR",
      effectiveDate: "2025-02-15",
      rateType: "monthly",
    });

    expect(result?.rateValue).toBeCloseTo(0.88, 2);
  });

  it("resolves BoC CAD based rate", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("FXUSDCAD")) {
        return {
          ok: true,
          json: async () => ({ observations: [{ FXUSDCAD: { v: "1.35" } }] }),
        };
      }

      return {
        ok: true,
        json: async () => ({ observations: [{ FXEURCAD: { v: "1.48" } }] }),
      };
    });

    vi.stubGlobal("fetch", fetchMock);
    const provider = new BocRateProvider();
    const result = await provider.getRate({
      baseCurrency: "USD",
      quoteCurrency: "EUR",
      effectiveDate: "2025-02-15",
      rateType: "historical",
    });

    expect(result?.rateValue).toBeCloseTo(0.91, 2);
  });
});
