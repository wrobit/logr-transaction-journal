"use client";

import { useActionState, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { deleteAccount, updateProfile } from "@/actions/profile";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { DeleteAccountDialog } from "@/components/profile/delete-account-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dayjs } from "@/lib/dayjs";
import { DISPLAY_CURRENCIES } from "@/lib/currency/display";
import {
  defaultUpdateProfileState,
  type UpdateProfileState,
} from "@/lib/profile/actions";
import type { ProfileView as ProfileViewData } from "@/lib/profile/types";

const labelClassName = "text-xs text-muted-foreground";
const inputClassName =
  "border-border bg-background text-sm text-foreground placeholder:text-muted-foreground";

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dayjs.utc(value).toDate());

type ProfileViewProps = {
  profile: ProfileViewData;
  updateAction?: typeof updateProfile;
  deleteAction?: typeof deleteAccount;
};

export function ProfileView({
  profile,
  updateAction,
  deleteAction,
}: ProfileViewProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("profile");
  const [isRefreshing, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [profileState, setProfileState] = useState(profile);
  const [formValues, setFormValues] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    login: profile.login,
    email: profile.email,
    displayCurrency: profile.displayCurrency,
  });

  const actionHandler = useCallback(
    async (prevState: UpdateProfileState, formData: FormData) => {
      const result = await (updateAction ?? updateProfile)(prevState, formData);

      if (result.status === "success" && result.profile) {
        toast.success(t("updatedToast"));
        setProfileState(result.profile);
        setFormValues({
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
          login: result.profile.login,
          email: result.profile.email,
          displayCurrency: result.profile.displayCurrency,
        });
        startTransition(() => router.refresh());
      }

      return result;
    },
    [router, startTransition, t, updateAction],
  );

  const [state, formAction, isPending] = useActionState<
    UpdateProfileState,
    FormData
  >(actionHandler, defaultUpdateProfileState);

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
        </div>
      </div>

      <section className="rounded-sm border border-border bg-muted/40 p-4">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("summary")}</h2>
            {isRefreshing ? (
              <span className="text-xs text-muted-foreground">{t("refreshing")}</span>
            ) : null}
        </div>
        <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div>
              <p className="text-xs text-muted-foreground">{t("name")}</p>
            <p>
              {profileState.firstName} {profileState.lastName}
            </p>
          </div>
          <div>
              <p className="text-xs text-muted-foreground">{t("login")}</p>
            <p>{profileState.login}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("email")}</p>
            <p>{profileState.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("currency")}</p>
            <p>{profileState.displayCurrency}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("memberSince")}</p>
            <p>{formatDate(profileState.createdAt, locale)}</p>
          </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("lastUpdated")}</p>
              <p>{formatDate(profileState.updatedAt, locale)}</p>
            </div>
        </div>
      </section>

      <section className="rounded-sm border border-border bg-background p-4">
        <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("editTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("editSubtitle")}</p>
          </div>

        <form action={formAction} className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName" className={labelClassName}>
                {t("firstName")}
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formValues.firstName}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
                required
                className={inputClassName}
              />
              {state.errors?.firstName ? (
                <p className="text-xs text-red-400">{state.errors.firstName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className={labelClassName}>
                {t("lastName")}
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={formValues.lastName}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    lastName: event.target.value,
                  }))
                }
                required
                className={inputClassName}
              />
              {state.errors?.lastName ? (
                <p className="text-xs text-red-400">{state.errors.lastName}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login" className={labelClassName}>
              {t("login")}
            </Label>
            <Input
              id="login"
              name="login"
              autoComplete="username"
              value={formValues.login}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  login: event.target.value,
                }))
              }
              required
              className={inputClassName}
            />
            {state.errors?.login ? (
              <p className="text-xs text-red-400">{state.errors.login}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className={labelClassName}>
              {t("email")}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formValues.email}
              readOnly
              required
              className={`${inputClassName} cursor-not-allowed opacity-70`}
            />
            {state.errors?.email ? (
              <p className="text-xs text-red-400">{state.errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayCurrency" className={labelClassName}>
              {t("currency")}
            </Label>
            <select
              id="displayCurrency"
              name="displayCurrency"
              value={formValues.displayCurrency}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  displayCurrency: event.target.value as (typeof DISPLAY_CURRENCIES)[number],
                }))
              }
              required
              className="h-9 w-full rounded-none border border-border bg-background px-3 text-sm text-foreground"
            >
              {DISPLAY_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            {state.errors?.displayCurrency ? (
              <p className="text-xs text-red-400">{state.errors.displayCurrency}</p>
            ) : null}
          </div>

          {state.message ? (
            <p className="text-xs text-red-400">{state.message}</p>
          ) : null}

          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <Button
              type="submit"
              className="bg-foreground text-background hover:bg-foreground/90"
              disabled={isPending}
            >
              {isPending ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-sm border border-destructive/40 bg-destructive/5 p-4">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-destructive">
            {t("deleteTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("deleteSubtitle")}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            {t("deleteButton")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("deleteHint")}
          </p>
        </div>
      </section>

      {deleteOpen ? (
        <DeleteAccountDialog
          open
          onOpenChange={setDeleteOpen}
          action={deleteAction}
        />
      ) : null}
    </div>
  );
}
