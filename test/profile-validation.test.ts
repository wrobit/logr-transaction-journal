import { describe, expect, it } from "vitest";

import {
  deleteAccountSchema,
  profileUpdateSchema,
} from "@/lib/profile/validation";

describe("profile validation", () => {
  it("rejects invalid profile input", () => {
    const result = profileUpdateSchema.safeParse({
      firstName: "",
      lastName: "",
      login: "ab",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("requires DELETE confirmation", () => {
    expect(
      deleteAccountSchema.safeParse({ confirmation: "delete" }).success,
    ).toBe(false);
    expect(
      deleteAccountSchema.safeParse({ confirmation: "DELETE" }).success,
    ).toBe(true);
  });

  it("accepts optional feedback fields", () => {
    expect(
      deleteAccountSchema.safeParse({
        confirmation: "DELETE",
        reason: "privacy",
        notes: "Missing audit exports",
      }).success,
    ).toBe(true);
  });
});
