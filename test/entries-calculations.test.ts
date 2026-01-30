// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  calculateFullPrice,
  calculateValuePln,
} from "@/lib/entries/calculations";

describe("entry calculations", () => {
  it("includes commission on buys", () => {
    const result = calculateFullPrice({
      quantity: 2,
      pricePerUnit: 100,
      commission: 5,
      operation: "BUY",
    });

    expect(result).toBe(205);
  });

  it("subtracts commission on sells", () => {
    const result = calculateFullPrice({
      quantity: 2,
      pricePerUnit: 100,
      commission: 5,
      operation: "SELL",
    });

    expect(result).toBe(195);
  });

  it("calculates PLN value", () => {
    const result = calculateValuePln(200, 4.2);

    expect(result).toBeCloseTo(840);
  });
});
