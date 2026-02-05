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

  it("returns default country policy when database has no overrides", async () => {
    const policy = await resolveProviderPolicy("GB", "rate");
    expect(policy).toEqual(["hmrc", "ecb"]);
  });

  it("returns empty when country is not enabled", async () => {
    process.env.INTL_COUNTRIES_ENABLED = "US,CA";
    const policy = await resolveProviderPolicy("GB", "rate");
    expect(policy).toEqual([]);
  });
});
