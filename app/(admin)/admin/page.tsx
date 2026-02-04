import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin overview and system monitoring for Entry.",
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-2">
        <h1 className="text-lg font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Admin tools and monitoring will live here.
        </p>
      </div>
    </div>
  );
}
