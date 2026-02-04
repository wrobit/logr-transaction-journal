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
import { feedbackOptions } from "@/lib/profile/feedback";

const STATUS_OPTIONS = [{ value: "all", label: "All reasons" }, ...feedbackOptions];

export function AdminFeedbackFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const reason = searchParams.get("reason") ?? "all";
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";

  const reasonValue = useMemo(
    () => STATUS_OPTIONS.find((option) => option.value === reason)?.value ?? "all",
    [reason],
  );

  const updateParams = useCallback(
    (updates: { reason?: string; start?: string; end?: string }) => {
      const params = new URLSearchParams(searchParams);

      const nextReason = updates.reason ?? reasonValue;
      const nextStart = updates.start ?? start;
      const nextEnd = updates.end ?? end;

      if (nextReason && nextReason !== "all") {
        params.set("reason", nextReason);
      } else {
        params.delete("reason");
      }

      if (nextStart) {
        params.set("start", nextStart);
      } else {
        params.delete("start");
      }

      if (nextEnd) {
        params.set("end", nextEnd);
      } else {
        params.delete("end");
      }

      params.delete("page");

      const queryString = params.toString();
      startTransition(() =>
        router.push(queryString ? `/admin/feedback?${queryString}` : "/admin/feedback"),
      );
    },
    [router, searchParams, start, end, reasonValue, startTransition],
  );

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Reason</span>
          <Select value={reasonValue} onValueChange={(value) => updateParams({ reason: value })}>
            <SelectTrigger size="sm" className="min-w-[160px]">
              <SelectValue placeholder="Reason" />
            </SelectTrigger>
            <SelectContent align="start">
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input
            type="date"
            defaultValue={start}
            onBlur={(event) => updateParams({ start: event.target.value })}
            className="border-border bg-background text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input
            type="date"
            defaultValue={end}
            onBlur={(event) => updateParams({ end: event.target.value })}
            className="border-border bg-background text-sm"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border text-muted-foreground"
        onClick={() => updateParams({ reason: "all", start: "", end: "" })}
        disabled={isPending}
      >
        Reset filters
      </Button>
    </div>
  );
}
