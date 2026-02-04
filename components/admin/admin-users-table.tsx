import Link from "next/link";

import { softDeleteUser, restoreUser, purgeUserEntries } from "@/actions/admin-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  if (users.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        No users match this filter.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">User</th>
            <th className="px-3 py-3 font-medium">Role</th>
            <th className="px-3 py-3 font-medium">Entries</th>
            <th className="px-3 py-3 font-medium">Created</th>
            <th className="px-3 py-3 font-medium">Last login</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium text-right">Actions</th>
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
                      {user.email} · {user.login}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Badge
                    variant={user.role === "admin" ? "secondary" : "outline"}
                    className={user.role === "admin" ? "bg-emerald-500/10 text-emerald-200" : ""}
                  >
                    {user.role}
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
                    {isDeleted ? "Deleted" : "Active"}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {isDeleted ? (
                        <form action={restoreUser}>
                          <input type="hidden" name="userId" value={user.id} />
                          <Button type="submit" size="sm" disabled={isSelf}>
                            Restore
                          </Button>
                        </form>
                      ) : (
                        <form action={softDeleteUser}>
                          <input type="hidden" name="userId" value={user.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="destructive"
                            disabled={isSelf}
                          >
                            Deactivate
                          </Button>
                        </form>
                      )}
                      <form action={purgeUserEntries}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Purge entries
                        </Button>
                      </form>
                    </div>
                    {isSelf ? (
                      <span className="text-[11px] text-muted-foreground">
                        You cannot change your own status.
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
