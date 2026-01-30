"use client";

import { useActionState, useCallback, useMemo, useRef, useState } from "react";

import {
  calculateFullPrice,
  calculateValuePln,
} from "@/lib/entries/calculations";
import type { EntryView } from "@/lib/entries/types";
import { formatNumber, formatPln } from "@/lib/format/numbers";
import { createEntry } from "@/actions/entries";
import {
  defaultCreateEntryState,
  type CreateEntryState,
} from "@/lib/entries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_OPERATION = "BUY";
const DEFAULT_CURRENCY = "PLN";
const DEFAULT_ASSET = "BTC";

const ASSET_OPTIONS = ["BTC", "ETH", "SOL"] as const;
const QUOTE_CURRENCY_OPTIONS = ["PLN", "EUR", "USD"] as const;

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

type AddEntryDialogProps = {
  onCreated: (entry: EntryView) => void;
  action?: typeof createEntry;
};

export function AddEntryDialog({ onCreated, action }: AddEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState(DEFAULT_OPERATION);
  const [baseAsset, setBaseAsset] = useState(DEFAULT_ASSET);
  const [quoteCurrency, setQuoteCurrency] = useState(DEFAULT_CURRENCY);
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [commission, setCommission] = useState("");

  const formRef = useRef<HTMLFormElement>(null);

  const actionHandler = useCallback(
    async (prevState: CreateEntryState, formData: FormData) => {
      const result = await (action ?? createEntry)(prevState, formData);

      if (result.status === "success" && result.entry) {
        onCreated(result.entry);
        formRef.current?.reset();
        setQuantity("");
        setPricePerUnit("");
        setCommission("");
        setOperation(DEFAULT_OPERATION);
        setBaseAsset(DEFAULT_ASSET);
        setQuoteCurrency(DEFAULT_CURRENCY);
        setOpen(false);
      }

      return result;
    },
    [action, onCreated],
  );

  const [state, formAction, isPending] = useActionState<CreateEntryState, FormData>(
    actionHandler,
    defaultCreateEntryState,
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


  const errorMessage = state.message ?? null;

  return (
    <div>
      <Button
        type="button"
        className="bg-white text-black hover:bg-neutral-200"
        onClick={() => setOpen(true)}
      >
        Add entry
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-sm border border-neutral-800 bg-neutral-950 p-6 text-sm text-white shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">New entry</h2>
                <p className="text-xs text-neutral-400">
                  Fill in the transaction details to calculate PLN value.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-neutral-400"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>

            <form
              ref={formRef}
              action={formAction}
              className="mt-6 grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="date" className="text-xs text-neutral-300">
                  Date
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  className="border-neutral-800 bg-neutral-950 text-sm text-white"
                />
                {state.errors?.date ? (
                  <p className="text-xs text-red-400">{state.errors.date}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="operation" className="text-xs text-neutral-300">
                  Operation
                </Label>
                <select
                  id="operation"
                  name="operation"
                  value={operation}
                  onChange={(event) => setOperation(event.target.value)}
                  className="h-9 w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 text-sm text-white"
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
                {state.errors?.operation ? (
                  <p className="text-xs text-red-400">
                    {state.errors.operation}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseAsset" className="text-xs text-neutral-300">
                  Asset
                </Label>
                <select
                  id="baseAsset"
                  name="baseAsset"
                  value={baseAsset}
                  onChange={(event) => setBaseAsset(event.target.value)}
                  className="h-9 w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 text-sm text-white"
                  required
                >
                  {ASSET_OPTIONS.map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
                {state.errors?.baseAsset ? (
                  <p className="text-xs text-red-400">
                    {state.errors.baseAsset}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="quoteCurrency"
                  className="text-xs text-neutral-300"
                >
                  Quote currency
                </Label>
                <select
                  id="quoteCurrency"
                  name="quoteCurrency"
                  value={quoteCurrency}
                  onChange={(event) => setQuoteCurrency(event.target.value)}
                  className="h-9 w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 text-sm text-white"
                  required
                >
                  {QUOTE_CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                {state.errors?.quoteCurrency ? (
                  <p className="text-xs text-red-400">
                    {state.errors.quoteCurrency}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-xs text-neutral-300">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.000000000001"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(normalizeNumericInput(event.target.value))
                  }
                  required
                  className="border-neutral-800 bg-neutral-950 text-sm text-white"
                />
                {state.errors?.quantity ? (
                  <p className="text-xs text-red-400">
                    {state.errors.quantity}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="pricePerUnit"
                  className="text-xs text-neutral-300"
                >
                  Price per unit
                </Label>
                <Input
                  id="pricePerUnit"
                  name="pricePerUnit"
                  type="number"
                  step="0.000000000001"
                  value={pricePerUnit}
                  onChange={(event) =>
                    setPricePerUnit(normalizeNumericInput(event.target.value))
                  }
                  required
                  className="border-neutral-800 bg-neutral-950 text-sm text-white"
                />
                {state.errors?.pricePerUnit ? (
                  <p className="text-xs text-red-400">
                    {state.errors.pricePerUnit}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission" className="text-xs text-neutral-300">
                  Commission
                </Label>
                <Input
                  id="commission"
                  name="commission"
                  type="number"
                  step="0.000000000001"
                  value={commission}
                  onChange={(event) =>
                    setCommission(normalizeNumericInput(event.target.value))
                  }
                  className="border-neutral-800 bg-neutral-950 text-sm text-white"
                />
                {state.errors?.commission ? (
                  <p className="text-xs text-red-400">
                    {state.errors.commission}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="source" className="text-xs text-neutral-300">
                  Source
                </Label>
                <Input
                  id="source"
                  name="source"
                  className="border-neutral-800 bg-neutral-950 text-sm text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="note" className="text-xs text-neutral-300">
                  Note
                </Label>
                <textarea
                  id="note"
                  name="note"
                  className="min-h-[80px] w-full rounded-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="rounded-sm border border-neutral-800 bg-neutral-950/60 p-4 text-xs text-neutral-300 md:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Live preview
                </p>
                <div className="mt-3 grid gap-2 text-xs text-white md:grid-cols-3">
                  <div>
                    <p className="text-neutral-500">Full price</p>
                    <p>
                      {preview
                        ? formatNumber(preview.fullPrice)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">NBP rate</p>
                    <p>
                      {preview?.isPln
                        ? "1.00"
                        : "Resolved on save"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Value PLN</p>
                    <p>
                      {preview?.valuePln !== null && preview?.valuePln !== undefined
                        ? formatPln(preview.valuePln)
                        : "Resolved on save"}
                    </p>
                  </div>
                </div>
              </div>

              {errorMessage ? (
                <p className="text-xs text-red-400 md:col-span-2">
                  {errorMessage}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="border-neutral-700 bg-neutral-900/70 text-white hover:bg-neutral-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-white text-black hover:bg-neutral-200"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save entry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
