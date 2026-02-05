import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminSession } from "@/lib/auth/admin";
import { getServerTranslator } from "@/lib/i18n/translate";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getServerTranslator();
  await requireAdminSession();

  return (
    <div className="min-h-screen bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">{t("admin.layout.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.layout.subtitle")}
          </p>
        </div>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
