import Link from "next/link";
import { useTranslations } from "next-intl";

import { softDeleteUser, restoreUser, purgeUserEntries } from "@/actions/admin-users";
import { AdminUserActionDialog } from "@/components/admin/admin-user-action-dialog";
import { Badge } from "@/components/ui/badge";
import type { AdminUserRow } from "@/actions/admin-users";
import { dayjs } from "@/lib/dayjs";

const formatDate = (value?: Date | null) =>
  value ? dayjs.utc(value).format("YYYY-MM-DD") : "—";

const formatDateTime = (value?: Date | null) =>
  value ? dayjs.utc(value).format("YYYY-MM-DD HH:mm") : "—";

type AdminUsersTableProps = {
  users: AdminUserRow[];
  currentUserId: string;
};

export function AdminUsersTable({ users, currentUserId }: AdminUsersTableProps) {
  const t = useTranslations("admin.users");

  if (users.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">{t("columns.user")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.role")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.entries")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.created")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.lastLogin")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.status")}</th>
            <th className="px-3 py-3 font-medium text-right">{t("columns.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => {
            const isDeleted = Boolean(user.deletedAt);
            const isSelf = user.id === currentUserId;

            return (
              <tr key={user.id} className="bg-background">
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <Link href={`/admin/users/${user.id}`} className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                      {user.login && user.login !== user.email ? ` · ${user.login}` : ""}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Badge
                    variant={user.role === "admin" ? "secondary" : "outline"}
                    className={user.role === "admin" ? "bg-emerald-500/10 text-emerald-200" : ""}
                  >
                    {user.role === "admin" ? t("roleAdmin") : t("roleUser")}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{user.entriesCount}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {formatDateTime(user.lastLoginAt)}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={isDeleted ? "destructive" : "secondary"}>
                    {isDeleted ? t("deleted") : t("active")}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {isDeleted ? (
                        <AdminUserActionDialog
                          userId={user.id}
                          title={t("restoreTitle")}
                          description={t("restoreDescription")}
                          triggerLabel={t("restore")}
                          confirmLabel={t("restore")}
                          successMessage={t("restored")}
                          action={restoreUser}
                          triggerVariant="outline"
                          confirmVariant="default"
                          disabled={isSelf}
                        />
                      ) : (
                        <AdminUserActionDialog
                          userId={user.id}
                          title={t("deactivateTitle")}
                          description={t("deactivateDescription")}
                          triggerLabel={t("deactivate")}
                          confirmLabel={t("deactivate")}
                          successMessage={t("deactivated")}
                          action={softDeleteUser}
                          triggerVariant="destructive"
                          confirmVariant="destructive"
                          disabled={isSelf}
                        />
                      )}
                      <AdminUserActionDialog
                        userId={user.id}
                        title={t("purgeTitle")}
                        description={t("purgeDescription")}
                        triggerLabel={t("purge")}
                        confirmLabel={t("purge")}
                        successMessage={t("purged")}
                        action={purgeUserEntries}
                        triggerVariant="outline"
                        confirmVariant="destructive"
                      />
                    </div>
                    {isSelf ? (
                      <span className="text-[11px] text-muted-foreground">
                        {t("selfGuard")}
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
