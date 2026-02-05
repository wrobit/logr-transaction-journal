import { describe, expect, it } from "vitest";

import { formatCurrency, formatNumber } from "@/lib/format/numbers";

describe("locale-aware formatting", () => {
  it("formats numbers differently for en and pl", () => {
    const en = formatNumber(1234.56, undefined, "en");
    const pl = formatNumber(1234.56, undefined, "pl");

    expect(en).not.toBe(pl);
  });

  it("formats currency in selected currency", () => {
    const eur = formatCurrency(100, "EUR", "en");
    const usd = formatCurrency(100, "USD", "en");

    expect(eur).not.toBe(usd);
  });
});
