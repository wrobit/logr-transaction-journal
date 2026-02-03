"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";

import { deleteAccount } from "@/actions/profile";
import {
  defaultDeleteAccountState,
  type DeleteAccountState,
} from "@/lib/profile/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const labelClassName = "text-xs text-muted-foreground";
const inputClassName =
  "border-border bg-background text-sm text-foreground placeholder:text-muted-foreground";

const feedbackOptions = [
  { value: "tracking_elsewhere", label: "Tracking elsewhere" },
  { value: "no_longer_needed", label: "No longer needed" },
  { value: "missing_features", label: "Missing features" },
  { value: "too_complex", label: "Too complex" },
  { value: "privacy", label: "Privacy concerns" },
  { value: "other", label: "Other" },
];

type DeleteStep = "warning" | "feedback";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: typeof deleteAccount;
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
  action,
}: DeleteAccountDialogProps) {
  const [step, setStep] = useState<DeleteStep>("warning");
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setStep("warning");
      setConfirmation("");
      setReason("");
      setNotes("");
    }
  }, [open]);

  const actionHandler = useCallback(
    async (prevState: DeleteAccountState, formData: FormData) => {
      const result = await (action ?? deleteAccount)(prevState, formData);

      if (result.status === "success") {
        await signOut({ callbackUrl: "/goodbye" });
        onOpenChange(false);
      }

      return result;
    },
    [action, onOpenChange],
  );

  const [state, formAction, isPending] = useActionState<
    DeleteAccountState,
    FormData
  >(actionHandler, defaultDeleteAccountState);

  const isConfirmed = confirmation.trim() === "DELETE";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form action={formAction} className="grid gap-4">
          {step === "warning" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account</AlertDialogTitle>
                <AlertDialogDescription>
                  You&apos;re about to permanently delete your Entry profile.
                  We&apos;ll ask for quick feedback next.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="rounded-sm border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>This action will remove:</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>All transaction entries and valuations</li>
                  <li>Saved notes and sources</li>
                </ul>
                <p className="mt-3">This cannot be undone once confirmed.</p>
              </div>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Before you go</AlertDialogTitle>
                <AlertDialogDescription>
                  Share a quick reason, then confirm deletion.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2">
                <p className={labelClassName}>Why are you leaving? (optional)</p>
                <div className="grid gap-2 text-sm">
                  {feedbackOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="reason"
                        value={option.value}
                        checked={reason === option.value}
                        onChange={(event) => setReason(event.target.value)}
                        className="h-4 w-4 accent-foreground"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className={labelClassName}>
                  Anything else to share?
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional feedback"
                  className="min-h-[120px] rounded-none border-border bg-background text-sm text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation" className={labelClassName}>
                  Type DELETE to confirm
                </Label>
                <Input
                  id="confirmation"
                  name="confirmation"
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(event.target.value.toUpperCase())
                  }
                  className={inputClassName}
                  placeholder="DELETE"
                />
                <p className="text-xs text-muted-foreground">
                  Your session will end immediately after deletion.
                </p>
              </div>
            </>
          )}

          {step === "feedback" && state.message ? (
            <p className="text-xs text-red-400">{state.message}</p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            {step === "warning" ? (
              <Button
                type="button"
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setStep("feedback")}
              >
                Continue
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("warning")}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={!isConfirmed || isPending}
                >
                  {isPending ? "Deleting..." : "Delete account"}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
