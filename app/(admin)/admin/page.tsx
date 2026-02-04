import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Admin",
  description: "Admin overview and system monitoring for Entry.",
};

export default function AdminPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">Overview</h2>
      <p className="text-sm text-muted-foreground">
        Admin tools and monitoring will live here.
      </p>
    </div>
  );
}
