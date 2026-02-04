import { describe, expect, it } from "vitest";

import {
  buildAdminAuditQueryParams,
  parseAdminAuditQuery,
} from "@/lib/admin/audit-query";

describe("admin audit query parsing", () => {
  it("parses query params into filters", () => {
    const result = parseAdminAuditQuery({
      action: "user.deactivated",
      q: "piotr",
      page: "2",
    });

    expect(result).toEqual({
      action: "user.deactivated",
      search: "piotr",
      page: 2,
    });
  });

  it("ignores invalid params", () => {
    const result = parseAdminAuditQuery({
      action: "bad",
      page: "0",
      q: " ",
    });

    expect(result).toEqual({
      action: undefined,
      search: undefined,
      page: 1,
    });
  });

  it("builds query params", () => {
    const params = buildAdminAuditQueryParams({
      action: "entries.purged",
      search: "admin",
      page: 3,
    });

    expect(params.get("action")).toBe("entries.purged");
    expect(params.get("q")).toBe("admin");
    expect(params.get("page")).toBe("3");
  });
});
