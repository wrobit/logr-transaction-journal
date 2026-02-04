import { z } from "zod";

export const ADMIN_AUDIT_ACTION_OPTIONS = [
  { value: "user.deactivated", label: "User deactivated" },
  { value: "user.restored", label: "User restored" },
  { value: "entries.purged", label: "Entries purged" },
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTION_OPTIONS)[number]["value"];

export type AdminAuditQuery = {
  action?: AdminAuditAction;
  search?: string;
  page: number;
};

const actionSchema = z.enum(ADMIN_AUDIT_ACTION_OPTIONS.map((option) => option.value) as [
  AdminAuditAction,
  ...AdminAuditAction[],
]);

const getFirstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseAdminAuditQuery(
  params: Record<string, string | string[] | undefined>,
): AdminAuditQuery {
  const actionResult = actionSchema.safeParse(getFirstValue(params.action));
  const searchValue = getFirstValue(params.q);
  const pageValue = Number(getFirstValue(params.page));

  return {
    action: actionResult.success ? actionResult.data : undefined,
    search: searchValue?.trim() ? searchValue.trim() : undefined,
    page: Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1,
  };
}

export function buildAdminAuditQueryParams(query: {
  action?: AdminAuditAction;
  search?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (query.action) {
    params.set("action", query.action);
  }

  if (query.search) {
    params.set("q", query.search);
  }

  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }

  return params;
}

export function getAdminAuditActionLabel(action: AdminAuditAction) {
  return (
    ADMIN_AUDIT_ACTION_OPTIONS.find((option) => option.value === action)?.label ?? action
  );
}
