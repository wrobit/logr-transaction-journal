"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminUsersFilters() {
  const t = useTranslations("admin.users");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  const statusOptions = useMemo(
    () => [
      { value: "all", label: t("allUsers") },
      { value: "active", label: t("active") },
      { value: "deleted", label: t("deleted") },
    ],
    [t],
  );

  const statusValue = useMemo(
    () => statusOptions.find((option) => option.value === status)?.value ?? "all",
    [status, statusOptions],
  );

  const updateParams = useCallback(
    (nextSearch: string, nextStatus: string) => {
      const params = new URLSearchParams(searchParams);

      if (nextSearch) {
        params.set("q", nextSearch);
      } else {
        params.delete("q");
      }

      if (nextStatus && nextStatus !== "all") {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }

      const queryString = params.toString();
      startTransition(() => router.push(queryString ? `/admin/users?${queryString}` : "/admin/users"));
    },
    [router, searchParams, startTransition],
  );

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
          placeholder={t("searchPlaceholder")}
          defaultValue={search}
          onBlur={(event) => updateParams(event.target.value.trim(), statusValue)}
          className="max-w-sm border-border bg-background text-sm"
        />
        <Select value={statusValue} onValueChange={(value) => updateParams(search, value)}>
            <SelectTrigger size="sm" className="min-w-[140px]">
            <SelectValue placeholder={t("statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent align="start">
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border text-muted-foreground"
        onClick={() => updateParams("", "all")}
        disabled={isPending}
      >
        {tc("resetFilters")}
      </Button>
    </div>
  );
}
