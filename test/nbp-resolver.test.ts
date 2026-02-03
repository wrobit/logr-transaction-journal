// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { dayjs } from "@/lib/dayjs";
import { getNbpRate, resolveRateDate } from "@/lib/nbp";

describe("NBP resolver", () => {
  it("uses previous day for weekdays", () => {
    const date = dayjs.utc("2025-10-22").toDate();
    expect(dayjs.utc(resolveRateDate(date)).format("YYYY-MM-DD")).toBe("2025-10-21");
  });

  it("uses Friday for Sundays", () => {
    const date = dayjs.utc("2025-10-19").toDate();
    expect(dayjs.utc(resolveRateDate(date)).format("YYYY-MM-DD")).toBe("2025-10-17");
  });

  it("returns cached rate when available", async () => {
    const getCachedRate = vi.fn().mockResolvedValue(4.2);
    const fetchRate = vi.fn();

    const result = await getNbpRate("EUR", dayjs.utc("2025-10-22").toDate(), {
      getCachedRate,
      setCachedRate: vi.fn(),
      fetchRate,
    });

    expect(result.rate).toBe(4.2);
    expect(fetchRate).not.toHaveBeenCalled();
  });

  it("falls back when fetch misses", async () => {
    const getCachedRate = vi.fn().mockResolvedValue(null);
    const fetchRate = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(4.3);
    const setCachedRate = vi.fn();

    const result = await getNbpRate("EUR", dayjs.utc("2025-10-22").toDate(), {
      getCachedRate,
      fetchRate,
      setCachedRate,
      maxLookbackDays: 2,
    });

    expect(result.rate).toBe(4.3);
    expect(setCachedRate).toHaveBeenCalledTimes(1);
  });
});
