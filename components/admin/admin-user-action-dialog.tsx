"use client";

import type React from "react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type AdminUserActionDialogProps = {
  userId: string;
  title: string;
  description: string;
  triggerLabel: string;
  confirmLabel: string;
  successMessage: string;
  action: (userId: string) => Promise<{ status: "success" | "error"; message?: string }>;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
};

export function AdminUserActionDialog({
  userId,
  title,
  description,
  triggerLabel,
  confirmLabel,
  successMessage,
  action,
  triggerVariant = "outline",
  confirmVariant = "destructive",
  disabled = false,
}: AdminUserActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = useCallback(() => {
    startTransition(async () => {
      const result = await action(userId);

      if (result.status === "success") {
        toast.success(successMessage);
        setOpen(false);
      } else {
        toast.error(result.message ?? "Action failed.");
      }
    });
  }, [action, successMessage, userId]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant={triggerVariant} disabled={disabled}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
