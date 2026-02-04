import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Audit",
  description: "Audit log for admin actions.",
};

export default function AdminAuditPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">Audit log</h2>
      <p className="text-sm text-muted-foreground">
        Admin audit logging will be added in the next phase.
      </p>
    </div>
  );
}
