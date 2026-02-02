"use client";

import { useActionState, useCallback } from "react";

import { deleteEntry } from "@/actions/entries";
import {
  defaultDeleteEntryState,
  type DeleteEntryState,
} from "@/lib/entries/actions";
import type { EntryView } from "@/lib/entries/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
            <AlertDialogTitle>Delete entry</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the entry for {entry.baseAsset} on
              {" "}
              {entry.date}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {state.message ? (
            <p className="text-xs text-red-400">{state.message}</p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              variant="destructive"
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
