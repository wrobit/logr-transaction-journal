import type { Metadata } from "next";

import { getAdminUsers } from "@/actions/admin-users";
import { AdminUsersFilters } from "@/components/admin/admin-users-filters";
import { AdminUsersPagination } from "@/components/admin/admin-users-pagination";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { requireAdminSession } from "@/lib/auth/admin";
import { getServerTranslator } from "@/lib/i18n/translate";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return buildPageMetadata({
    title: t("metadata.adminUsers.title"),
    description: t("metadata.adminUsers.description"),
    path: "/admin/users",
  });
}

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

const parseSearchParam = (value?: string | string[]) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;

const parsePage = (value?: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.max(1, Math.floor(parsed));
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const t = await getServerTranslator();
  const session = await requireAdminSession();
  const resolvedParams = await searchParams;

  const search = parseSearchParam(resolvedParams?.q)?.trim() ?? "";
  const status = parseSearchParam(resolvedParams?.status) as
    | "all"
    | "active"
    | "deleted"
    | undefined;
  const page = parsePage(parseSearchParam(resolvedParams?.page));

  const data = await getAdminUsers({
    search,
    status,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-base font-semibold">{t("admin.users.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.users.subtitle")}
        </p>
      </div>
      <AdminUsersFilters />
      <div className="text-xs text-muted-foreground">
        {t("admin.users.summary", { count: data.totalCount, page: data.page })}
      </div>
      <AdminUsersTable users={data.users} currentUserId={session.user.id} />
      <AdminUsersPagination page={data.page} totalPages={totalPages} />
    </div>
  );
}
