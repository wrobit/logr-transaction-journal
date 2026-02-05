import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminUser, getAdminUserEntries } from "@/actions/admin-users";
import { AdminUserEntriesTable } from "@/components/admin/admin-user-entries-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/admin";
import { dayjs } from "@/lib/dayjs";
import { getServerTranslator } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return {
    title: t("metadata.adminUser.title"),
    description: t("metadata.adminUser.description"),
  };
}

const formatDate = (value?: Date | null) =>
  value ? dayjs.utc(value).format("YYYY-MM-DD") : "—";

type PageProps = {
  params: { userId: string };
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const t = await getServerTranslator();
  await requireAdminSession();

  const user = await getAdminUser(params.userId);

  if (!user) {
    redirect("/admin/users");
  }

  const entries = await getAdminUserEntries(user.id);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-base font-semibold">
          {user.firstName} {user.lastName}
        </h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <Card>
        <CardHeader className="border-b border-border/60">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("admin.userDetail.summaryTitle")}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("admin.userDetail.login")}</p>
            <p>{user.login}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("admin.userDetail.role")}</p>
            <Badge variant={user.role === "admin" ? "secondary" : "outline"}>
              {user.role === "admin" ? t("admin.users.roleAdmin") : t("admin.users.roleUser")}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("admin.userDetail.created")}</p>
            <p>{formatDate(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("admin.userDetail.lastLogin")}</p>
            <p>{formatDate(user.lastLoginAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("admin.userDetail.updated")}</p>
            <p>{formatDate(user.updatedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("admin.userDetail.status")}</p>
            <Badge variant={user.deletedAt ? "destructive" : "secondary"}>
              {user.deletedAt ? t("admin.users.deleted") : t("admin.users.active")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("admin.userDetail.entriesTitle")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("admin.userDetail.entriesSubtitle")}
        </p>
      </div>
      <AdminUserEntriesTable entries={entries} />
    </div>
  );
}
