"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADMIN_AUDIT_ACTION_OPTIONS } from "@/lib/admin/audit-query";

export function AdminAuditFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const action = searchParams.get("action") ?? "all";
  const search = searchParams.get("q") ?? "";

  const actionValue = useMemo(
    () =>
      ADMIN_AUDIT_ACTION_OPTIONS.find((option) => option.value === action)?.value ?? "all",
    [action],
  );

  const updateParams = useCallback(
    (updates: { action?: string; search?: string }) => {
      const params = new URLSearchParams(searchParams);

      const nextAction = updates.action ?? actionValue;
      const nextSearch = updates.search ?? search;

      if (nextAction && nextAction !== "all") {
        params.set("action", nextAction);
      } else {
        params.delete("action");
      }

      if (nextSearch) {
        params.set("q", nextSearch);
      } else {
        params.delete("q");
      }

      params.delete("page");

      const queryString = params.toString();
      startTransition(() =>
        router.push(queryString ? `/admin/audit?${queryString}` : "/admin/audit"),
      );
    },
    [router, searchParams, actionValue, search, startTransition],
  );

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search actor or target"
          defaultValue={search}
          onBlur={(event) => updateParams({ search: event.target.value.trim() })}
          className="max-w-sm border-border bg-background text-sm"
        />
        <Select value={actionValue} onValueChange={(value) => updateParams({ action: value })}>
          <SelectTrigger size="sm" className="min-w-[180px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All actions</SelectItem>
            {ADMIN_AUDIT_ACTION_OPTIONS.map((option) => (
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
        onClick={() => updateParams({ action: "all", search: "" })}
        disabled={isPending}
      >
        Reset filters
      </Button>
    </div>
  );
}
