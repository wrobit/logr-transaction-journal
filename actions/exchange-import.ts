"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { ensureUserId } from "@/lib/auth/users";
import type {
  ExchangeImportConfirmState,
  ExchangeImportPreviewState,
} from "@/lib/exchange-import/actions";
import {
  confirmExchangeImport,
  listRecentImportBatches,
  previewExchangeImport,
} from "@/lib/exchange-import/service";
import type { CanonicalImportTransaction, ExchangeCsvProvider } from "@/lib/exchange-import/types";
import { EXCHANGE_CSV_PROVIDERS } from "@/lib/exchange-import/types";

function isExchangeProvider(value: string): value is ExchangeCsvProvider {
  return EXCHANGE_CSV_PROVIDERS.includes(value as ExchangeCsvProvider);
}

export async function previewExchangeImportAction(
  _prevState: ExchangeImportPreviewState,
  formData: FormData,
): Promise<ExchangeImportPreviewState> {
  const session = await getServerSession(authOptions);
  const userId = await ensureUserId(session?.user ?? {});

  if (!userId) {
    return {
      status: "error",
      message: "Authentication required.",
    };
  }

  const providerRaw = formData.get("provider");
  const fileRaw = formData.get("file");

  if (typeof providerRaw !== "string" || !isExchangeProvider(providerRaw)) {
    return {
      status: "error",
      message: "Invalid provider.",
    };
  }

  if (!(fileRaw instanceof File)) {
    return {
      status: "error",
      message: "CSV file is required.",
    };
  }

  const content = new Uint8Array(await fileRaw.arrayBuffer());

  return previewExchangeImport({
    provider: providerRaw,
    filename: fileRaw.name,
    content,
  });
}

export async function confirmExchangeImportAction(input: {
  provider: ExchangeCsvProvider;
  filename?: string | null;
  rows: CanonicalImportTransaction[];
}): Promise<ExchangeImportConfirmState> {
  const session = await getServerSession(authOptions);
  const userId = await ensureUserId(session?.user ?? {});

  if (!userId) {
    return {
      status: "error",
      message: "Authentication required.",
    };
  }

  const result = await confirmExchangeImport({
    userId,
    provider: input.provider,
    filename: input.filename ?? null,
    rows: input.rows,
  });

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/summary");
    revalidatePath("/dashboard");
  }

  return result;
}

export async function listExchangeImportHistoryAction() {
  const session = await getServerSession(authOptions);
  const userId = await ensureUserId(session?.user ?? {});

  if (!userId) {
    return [];
  }

  return listRecentImportBatches(userId);
}
