import { describe, expect, it, vi } from "vitest";

import { fetchJsonWithRetry } from "@/lib/integrations/http";

describe("integration http utilities", () => {
  it("retries and returns json payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchJsonWithRetry<{ ok: boolean }>("https://example.test");

    expect(payload.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
