"use client";

import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";

import { deleteAccount } from "@/actions/profile";
import {
  defaultDeleteAccountState,
  type DeleteAccountState,
} from "@/lib/profile/actions";
import { feedbackOptions } from "@/lib/profile/feedback";
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

const labelClassName = "text-xs text-muted-foreground";
const inputClassName =
  "border-border bg-background text-sm text-foreground placeholder:text-muted-foreground";

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
  const t = useTranslations("profile");
  const [step, setStep] = useState<DeleteStep>("warning");
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");

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
                <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="rounded-sm border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>{t("deleteDialog.removeListTitle")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>{t("deleteDialog.removeEntries")}</li>
                  <li>{t("deleteDialog.removeNotes")}</li>
                </ul>
                <p className="mt-3">{t("deleteDialog.cannotUndo")}</p>
              </div>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteDialog.beforeYouGo")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteDialog.feedbackPrompt")}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2">
                <p className={labelClassName}>{t("deleteDialog.reasonOptional")}</p>
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
                      <span>{t(`deleteDialog.reasons.${option.value}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation" className={labelClassName}>
                  {t("deleteDialog.typeDelete")}
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
                  {t("deleteDialog.sessionEnds")}
                </p>
              </div>
            </>
          )}

          {step === "feedback" && state.message ? (
            <p className="text-xs text-red-400">{state.message}</p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">{t("deleteDialog.cancel")}</AlertDialogCancel>
            {step === "warning" ? (
              <Button
                type="button"
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setStep("feedback")}
              >
                {t("deleteDialog.continue")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("warning")}
                >
                  {t("deleteDialog.back")}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={!isConfirmed || isPending}
                >
                  {isPending ? t("deleteDialog.deleting") : t("deleteDialog.confirm")}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
