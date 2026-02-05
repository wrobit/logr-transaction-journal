"use client";

import { useActionState, useCallback } from "react";
import { useTranslations } from "next-intl";

import { deleteEntry } from "@/actions/entries";
import {
  defaultDeleteEntryState,
  type DeleteEntryState,
} from "@/lib/entries/actions";
import type { EntryView } from "@/lib/entries/types";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const DEFAULT_STATE = defaultDeleteEntryState;

type DeleteEntryDialogProps = {
  entry: EntryView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  action?: typeof deleteEntry;
};

export function DeleteEntryDialog({
  entry,
  open,
  onOpenChange,
  onDeleted,
  action,
}: DeleteEntryDialogProps) {
  const t = useTranslations("entries");

  const actionHandler = useCallback(
    async (prevState: DeleteEntryState, formData: FormData) => {
      const result = await (action ?? deleteEntry)(prevState, formData);

      if (result.status === "success") {
        onDeleted();
        onOpenChange(false);
      }

      return result;
    },
    [action, onDeleted, onOpenChange],
  );

  const [state, formAction, isPending] = useActionState<DeleteEntryState, FormData>(
    actionHandler,
    DEFAULT_STATE,
  );

  if (!entry) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={entry.id} />
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                asset: entry.baseAsset,
                date: entry.date,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {state.message ? (
            <p className="text-xs text-red-400">{state.message}</p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">{t("deleteDialog.cancel")}</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
            >
              {isPending ? t("deleteDialog.deleting") : t("deleteDialog.confirm")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
