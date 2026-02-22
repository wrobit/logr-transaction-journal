// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn(async () => undefined));
const resolveProvidersMock = vi.hoisted(() => vi.fn());
const emitAlertMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: () => ({
      values: insertValuesMock,
    }),
  },
}));

vi.mock("@/lib/integrations/providers/registry", () => ({
  resolveRateProvidersForCountry: resolveProvidersMock,
}));

vi.mock("@/lib/integrations/alerts", () => ({
  emitIntegrationAlert: emitAlertMock,
}));

import { getInternationalRate } from "@/lib/integrations/rates-service";

const createSelectChain = <T,>(result: T) => ({
  from: () => ({
    where: () => ({
      orderBy: () => ({
        limit: () => Promise.resolve(result),
      }),
    }),
  }),
});

describe("rates service cache and fallback", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertValuesMock.mockReset();
    resolveProvidersMock.mockReset();
    emitAlertMock.mockReset();
  });

  it("returns fresh latest cache hit before provider call", async () => {
    selectMock.mockReturnValueOnce(
      createSelectChain([
        {
          sourceProvider: "nbp",
          baseCurrency: "EUR",
          quoteCurrency: "PLN",
          rateValue: "4.2",
          effectiveDate: new Date("2025-01-01T00:00:00.000Z"),
          publishedAt: null,
          retrievedAt: new Date(),
          rateType: "latest",
          method: "official_publication",
          rawSnapshot: { ok: true },
        },
      ]),
    );
    resolveProvidersMock.mockResolvedValue([]);

    const result = await getInternationalRate({
      countryCode: "PL",
      baseCurrency: "EUR",
      quoteCurrency: "PLN",
      effectiveDate: "2025-01-02",
      rateType: "latest",
    });

    expect(result.provider).toBe("nbp");
    expect(result.rateValue).toBe(4.2);
    expect(resolveProvidersMock).not.toHaveBeenCalled();
  });

  it("falls back to cached rate and emits alerts on provider downtime", async () => {
    selectMock
      .mockReturnValueOnce(createSelectChain([]))
      .mockReturnValueOnce(
        createSelectChain([
          {
            sourceProvider: "nbp",
            baseCurrency: "EUR",
            quoteCurrency: "PLN",
            rateValue: "4.1",
            effectiveDate: new Date("2025-01-01T00:00:00.000Z"),
            publishedAt: null,
            retrievedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
            rateType: "latest",
            method: "official_publication",
            rawSnapshot: { cached: true },
          },
        ]),
      );

    resolveProvidersMock.mockResolvedValue([
      {
        name: "nbp",
        getRate: vi.fn(),
        getLatest: vi.fn(async () => {
          throw new Error("timeout");
        }),
        getMetadata: vi.fn(),
      },
    ]);

    const result = await getInternationalRate({
      countryCode: "PL",
      baseCurrency: "EUR",
      quoteCurrency: "PLN",
      effectiveDate: "2025-01-02",
      rateType: "latest",
    });

    expect(result.warnings?.length).toBeGreaterThan(0);
    expect(emitAlertMock).toHaveBeenCalled();
  });
});
