"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type AdminFeedbackPaginationProps = {
  page: number;
  totalPages: number;
};

export function AdminFeedbackPagination({ page, totalPages }: AdminFeedbackPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updatePage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams);

      if (nextPage > 1) {
        params.set("page", String(nextPage));
      } else {
        params.delete("page");
      }

      const queryString = params.toString();
      startTransition(() =>
        router.push(queryString ? `/admin/feedback?${queryString}` : "/admin/feedback"),
      );
    },
    [router, searchParams, startTransition],
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1 || isPending}
          onClick={() => updatePage(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages || isPending}
          onClick={() => updatePage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
