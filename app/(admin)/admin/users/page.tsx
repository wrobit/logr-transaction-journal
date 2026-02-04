import type { Metadata } from "next";

import { getAdminUsers } from "@/actions/admin-users";
import { AdminUsersFilters } from "@/components/admin/admin-users-filters";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { requireAdminSession } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Admin Users",
  description: "Manage Entry user accounts and access.",
};

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

const parseSearchParam = (value?: string | string[]) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await requireAdminSession();
  const resolvedParams = await searchParams;

  const search = parseSearchParam(resolvedParams?.q)?.trim() ?? "";
  const status = parseSearchParam(resolvedParams?.status) as
    | "all"
    | "active"
    | "deleted"
    | undefined;

  const data = await getAdminUsers({
    search,
    status,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          Review accounts, update status, and purge entries when needed.
        </p>
      </div>
      <AdminUsersFilters />
      <div className="text-xs text-muted-foreground">
        {data.totalCount} users · showing page {data.page}
      </div>
      <AdminUsersTable users={data.users} currentUserId={session.user.id} />
    </div>
  );
}
