"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  calculateFullPrice,
  calculateValuePln,
} from "@/lib/entries/calculations";
import type { EntryView } from "@/lib/entries/types";
import { formatNumber, formatPln } from "@/lib/format/numbers";
import { updateEntry } from "@/actions/entries";
import {
  defaultUpdateEntryState,
  type UpdateEntryState,
} from "@/lib/entries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_OPERATION = "BUY";
const DEFAULT_CURRENCY = "USD";
const DEFAULT_ASSET = "BTC";

const BASE_ASSET_OPTIONS = ["BTC", "ETH", "SOL"] as const;
const QUOTE_CURRENCY_OPTIONS = ["PLN", "EUR", "USD"] as const;

const labelClassName = "text-xs text-muted-foreground";
const inputClassName =
  "border-border bg-background text-sm text-foreground placeholder:text-muted-foreground";
const selectClassName =
  "h-9 w-full rounded-none border border-border bg-background px-3 text-sm text-foreground";

const normalizeNumericInput = (value: string, decimals = 12) => {
  if (!value) {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return value;
  }

  if (value.includes("e") || value.includes("E")) {
    return numericValue.toFixed(decimals);
  }

  return value;
};

type EditEntryDialogProps = {
  entry: EntryView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (entry: EntryView) => void;
  action?: typeof updateEntry;
};

export function EditEntryDialog({
  entry,
  open,
  onOpenChange,
  onUpdated,
  action,
}: EditEntryDialogProps) {
  const locale = useLocale();
  const t = useTranslations("entries");
  const [operation, setOperation] = useState<string>(entry?.operation ?? DEFAULT_OPERATION);
  const [baseAsset, setBaseAsset] = useState(entry?.baseAsset ?? DEFAULT_ASSET);
  const [quoteCurrency, setQuoteCurrency] = useState(
    entry?.quoteCurrency ?? DEFAULT_CURRENCY,
  );
  const [date, setDate] = useState(entry?.date ?? "");
  const [quantity, setQuantity] = useState(entry?.quantity ?? "");
  const [pricePerUnit, setPricePerUnit] = useState(entry?.pricePerUnit ?? "");
  const [commission, setCommission] = useState(entry?.commission ?? "");
  const [source, setSource] = useState(entry?.source ?? "");
  const [note, setNote] = useState(entry?.note ?? "");

  const actionHandler = useCallback(
    async (prevState: UpdateEntryState, formData: FormData) => {
      const result = await (action ?? updateEntry)(prevState, formData);

      if (result.status === "success" && result.entry) {
        onUpdated(result.entry);
        onOpenChange(false);
      }

      return result;
    },
    [action, onOpenChange, onUpdated],
  );

  const [state, formAction, isPending] = useActionState<UpdateEntryState, FormData>(
    actionHandler,
    defaultUpdateEntryState,
  );

  const preview = useMemo(() => {
    const quantityValue = Number(quantity);
    const priceValue = Number(pricePerUnit);
    const commissionValue = commission ? Number(commission) : undefined;

    if (!quantityValue || !priceValue || Number.isNaN(quantityValue)) {
      return null;
    }

    const fullPrice = calculateFullPrice({
      quantity: quantityValue,
      pricePerUnit: priceValue,
      commission: commissionValue,
      operation: operation === "SELL" ? "SELL" : "BUY",
    });

    const isPln = quoteCurrency.trim().toUpperCase() === "PLN";

    return {
      fullPrice,
      valuePln: isPln ? calculateValuePln(fullPrice, 1) : null,
      isPln,
    };
  }, [commission, operation, pricePerUnit, quantity, quoteCurrency]);

  const assetOptions = useMemo<string[]>(() => {
    const optionSet = new Set<string>(BASE_ASSET_OPTIONS);
    if (baseAsset) {
      optionSet.add(baseAsset);
    }
    return Array.from(optionSet);
  }, [baseAsset]);

  const currencyOptions = useMemo<string[]>(() => {
    const optionSet = new Set<string>(QUOTE_CURRENCY_OPTIONS);
    if (quoteCurrency) {
      optionSet.add(quoteCurrency);
    }
    return Array.from(optionSet);
  }, [quoteCurrency]);

  const errorMessage = state.message ?? null;

  if (!entry) {
    return null;
  }

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-sm border border-border bg-background p-6 text-sm text-foreground shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
              <h2 className="text-lg font-semibold">{t("editDialog.title")}</h2>
              <p className="text-xs text-muted-foreground">{t("editDialog.subtitle")}</p>
            </div>
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            {t("addDialog.close")}
          </Button>
        </div>

        <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={entry.id} />

          <div className="space-y-2">
            <Label htmlFor="edit-date" className={labelClassName}>
              {t("addDialog.date")}
            </Label>
            <Input
              id="edit-date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClassName}
            />
            {state.errors?.date ? (
              <p className="text-xs text-red-400">{state.errors.date}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-operation" className={labelClassName}>
              {t("addDialog.operation")}
            </Label>
            <select
              id="edit-operation"
              name="operation"
              value={operation}
              onChange={(event) => setOperation(event.target.value)}
              className={selectClassName}
            >
              <option value="BUY">{t("buy")}</option>
              <option value="SELL">{t("sell")}</option>
            </select>
            {state.errors?.operation ? (
              <p className="text-xs text-red-400">{state.errors.operation}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-baseAsset" className={labelClassName}>
              {t("addDialog.asset")}
            </Label>
            <select
              id="edit-baseAsset"
              name="baseAsset"
              value={baseAsset}
              onChange={(event) => setBaseAsset(event.target.value)}
              className={selectClassName}
              required
            >
              {assetOptions.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </select>
            {state.errors?.baseAsset ? (
              <p className="text-xs text-red-400">{state.errors.baseAsset}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-quoteCurrency" className={labelClassName}>
              {t("addDialog.quoteCurrency")}
            </Label>
            <select
              id="edit-quoteCurrency"
              name="quoteCurrency"
              value={quoteCurrency}
              onChange={(event) => setQuoteCurrency(event.target.value)}
              className={selectClassName}
              required
            >
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            {state.errors?.quoteCurrency ? (
              <p className="text-xs text-red-400">{state.errors.quoteCurrency}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-quantity" className={labelClassName}>
              {t("addDialog.quantity")}
            </Label>
            <Input
              id="edit-quantity"
              name="quantity"
              type="number"
              step="0.000000000001"
              value={quantity}
              onChange={(event) =>
                setQuantity(normalizeNumericInput(event.target.value))
              }
              required
              className={inputClassName}
            />
            {state.errors?.quantity ? (
              <p className="text-xs text-red-400">{state.errors.quantity}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-pricePerUnit" className={labelClassName}>
              {t("addDialog.pricePerUnit")}
            </Label>
            <Input
              id="edit-pricePerUnit"
              name="pricePerUnit"
              type="number"
              step="0.000000000001"
              value={pricePerUnit}
              onChange={(event) =>
                setPricePerUnit(normalizeNumericInput(event.target.value))
              }
              required
              className={inputClassName}
            />
            {state.errors?.pricePerUnit ? (
              <p className="text-xs text-red-400">{state.errors.pricePerUnit}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-commission" className={labelClassName}>
              {t("addDialog.commission")}
            </Label>
            <Input
              id="edit-commission"
              name="commission"
              type="number"
              step="0.000000000001"
              value={commission}
              onChange={(event) =>
                setCommission(normalizeNumericInput(event.target.value))
              }
              className={inputClassName}
            />
            {state.errors?.commission ? (
              <p className="text-xs text-red-400">{state.errors.commission}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-source" className={labelClassName}>
              {t("addDialog.source")}
            </Label>
            <Input
              id="edit-source"
              name="source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-note" className={labelClassName}>
              {t("addDialog.note")}
            </Label>
            <textarea
              id="edit-note"
              name="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[80px] w-full rounded-none border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="rounded-sm border border-border bg-muted/40 p-4 text-xs text-muted-foreground md:col-span-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("addDialog.livePreview")}
            </p>
            <div className="mt-3 grid gap-2 text-xs text-foreground md:grid-cols-3">
              <div>
                <p className="text-muted-foreground">{t("addDialog.fullPrice")}</p>
                <p>{preview ? formatNumber(preview.fullPrice, undefined, locale) : "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("addDialog.nbpRate")}</p>
                <p>{preview?.isPln ? "1.00" : t("addDialog.resolvedOnSave")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("addDialog.valuePln")}</p>
                <p>
                  {preview?.valuePln !== null && preview?.valuePln !== undefined
                    ? formatPln(preview.valuePln, locale)
                    : t("addDialog.resolvedOnSave")}
                </p>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <p className="text-xs text-red-400 md:col-span-2">{errorMessage}</p>
          ) : null}

          <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-foreground hover:bg-muted"
            >
              {t("addDialog.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-foreground text-background hover:bg-foreground/90"
              disabled={isPending}
            >
              {isPending ? t("addDialog.saving") : t("editDialog.saveChanges")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;
}
