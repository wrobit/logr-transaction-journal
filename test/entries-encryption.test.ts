// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  decryptEntryPayload,
  encryptEntryPayload,
} from "@/lib/entries/encryption";
import type { EntryPayload } from "@/lib/entries/types";

const buildPayload = (): EntryPayload => ({
  operation: "BUY",
  baseAsset: "BTC",
  quoteCurrency: "USD",
  quantity: "1.25",
  pricePerUnit: "23000",
  fullPrice: "28750",
  commission: "10",
  source: "Coinbase",
  note: "Test payload",
  nbpRateDate: "2025-01-12",
  nbpRate: "4.12",
  valuePln: "118450",
});

describe("entry encryption", () => {
  it("roundtrips encrypted payloads", () => {
    const dek = Buffer.alloc(32, 7);
    const payload = buildPayload();
    const encrypted = encryptEntryPayload(payload, dek);
    const decrypted = decryptEntryPayload(encrypted, dek);

    expect(decrypted).toEqual(payload);
  });

  it("rejects tampered payloads", () => {
    const dek = Buffer.alloc(32, 3);
    const encrypted = encryptEntryPayload(buildPayload(), dek);

    encrypted.tag = Buffer.alloc(16, 1).toString("base64");

    expect(() => decryptEntryPayload(encrypted, dek)).toThrow();
  });

  it("rejects payloads decrypted with a different key", () => {
    const encrypted = encryptEntryPayload(buildPayload(), Buffer.alloc(32, 9));

    expect(() =>
      decryptEntryPayload(encrypted, Buffer.alloc(32, 1)),
    ).toThrow();
  });
});
