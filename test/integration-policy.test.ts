// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

import { resolveProviderPolicy } from "@/lib/integrations/policy";

const createSelectChain = <T,>(result: T) => ({
  from: () => ({
    where: () => ({
      orderBy: () => Promise.resolve(result),
    }),
  }),
});

describe("integration provider policy", () => {
  const originalEnabled = process.env.INTL_INTEGRATIONS_ENABLED;

  beforeEach(() => {
    process.env.INTL_INTEGRATIONS_ENABLED = "true";
    delete process.env.INTL_COUNTRIES_ENABLED;
    selectMock.mockReset();
    selectMock.mockReturnValue(createSelectChain([]));
  });

  afterEach(() => {
    if (originalEnabled === undefined) {
      delete process.env.INTL_INTEGRATIONS_ENABLED;
    } else {
      process.env.INTL_INTEGRATIONS_ENABLED = originalEnabled;
    }
  });

  it("returns Polish default policy when database has no overrides", async () => {
    const policy = await resolveProviderPolicy("PL", "rate");
    expect(policy).toEqual(["nbp"]);
  });

  it("returns empty when country is not enabled", async () => {
    process.env.INTL_COUNTRIES_ENABLED = "US,CA";
    const policy = await resolveProviderPolicy("PL", "rate");
    expect(policy).toEqual([]);
  });

  it("returns Polish bank import provider", async () => {
    const policy = await resolveProviderPolicy("PL", "bank_import");
    expect(policy).toEqual(["gocardless_bad"]);
  });

  it("ignores lock marker in resolved provider list", async () => {
    selectMock.mockReturnValueOnce(
      createSelectChain([
        { providerName: "__LOCKED__" },
        { providerName: "nbp" },
      ]),
    );

    const policy = await resolveProviderPolicy("PL", "rate");
    expect(policy).toEqual(["nbp"]);
  });
});
