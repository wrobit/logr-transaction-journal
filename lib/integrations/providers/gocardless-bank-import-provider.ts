import { fetchJsonWithRetry } from "@/lib/integrations/http";
import type { BankImportProvider } from "@/lib/integrations/providers/interfaces";
import type { NormalizedBankTransaction } from "@/lib/integrations/types";
import { normalizeCurrency } from "@/lib/integrations/utils";

const API_BASE = "https://bankaccountdata.gocardless.com/api/v2";

type AccessTokenResponse = {
  access: string;
};

type AccountsResponse = {
  accounts?: string[];
};

type AccountDetailsResponse = {
  iban?: string;
  name?: string;
};

type TransactionsResponse = {
  transactions?: {
    booked?: Array<{
      transactionId?: string;
      bookingDate?: string;
      valueDate?: string;
      transactionAmount?: { amount?: string; currency?: string };
      creditorName?: string;
      debtorName?: string;
      remittanceInformationUnstructured?: string;
      bankTransactionCode?: string;
    }>;
  };
};

export class GoCardlessBankImportProvider implements BankImportProvider {
  readonly name = "gocardless_bad" as const;

  async listAccounts(userId: string) {
    const token = await this.getAccessToken();
    const requisitionId = this.resolveRequisitionId(userId);
    const requisition = await fetchJsonWithRetry<AccountsResponse>(
      `${API_BASE}/requisitions/${encodeURIComponent(requisitionId)}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const accountIds = requisition.accounts ?? [];
    const accounts = await Promise.all(
      accountIds.map(async (accountRef) => {
        const details = await fetchJsonWithRetry<AccountDetailsResponse>(
          `${API_BASE}/accounts/${encodeURIComponent(accountRef)}/details/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const displayName = details.name?.trim() || details.iban?.trim() || accountRef;

        return {
          accountRef,
          displayName,
        };
      }),
    );

    return accounts;
  }

  async listTransactions(accountRef: string) {
    const token = await this.getAccessToken();
    const payload = await fetchJsonWithRetry<TransactionsResponse>(
      `${API_BASE}/accounts/${encodeURIComponent(accountRef)}/transactions/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const booked = payload.transactions?.booked ?? [];

    return booked.map((row, index): NormalizedBankTransaction => ({
      provider: this.name,
      accountRef,
      providerTransactionId: row.transactionId?.trim() || `${accountRef}-${index + 1}`,
      bookedAt: row.bookingDate || row.valueDate || new Date().toISOString().slice(0, 10),
      amount: Number(row.transactionAmount?.amount ?? 0),
      currency: normalizeCurrency(row.transactionAmount?.currency ?? "PLN"),
      counterparty: row.creditorName ?? row.debtorName ?? null,
      description: row.remittanceInformationUnstructured ?? null,
      category: row.bankTransactionCode ?? null,
      rawSnapshot: row,
    }));
  }

  async refreshConsent(userId: string) {
    if (!this.resolveOptionalRequisitionId(userId)) {
      return { status: "reconsent_required" as const };
    }

    return { status: "ok" as const };
  }

  private resolveRequisitionId(userId: string) {
    const requisitionId = this.resolveOptionalRequisitionId(userId);
    if (!requisitionId) {
      throw new Error("Missing GoCardless requisition id for this user.");
    }

    return requisitionId;
  }

  private resolveOptionalRequisitionId(userId: string) {
    const key = `INTL_GOCARDLESS_REQUISITION_${userId}`;
    return process.env[key] ?? process.env.INTL_GOCARDLESS_REQUISITION_ID;
  }

  private async getAccessToken() {
    const secretId = process.env.INTL_GOCARDLESS_SECRET_ID;
    const secretKey = process.env.INTL_GOCARDLESS_SECRET_KEY;

    if (!secretId || !secretKey) {
      throw new Error("GoCardless credentials are not configured.");
    }

    const token = await fetchJsonWithRetry<AccessTokenResponse>(
      `${API_BASE}/token/new/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret_id: secretId,
          secret_key: secretKey,
        }),
      },
    );

    if (!token.access) {
      throw new Error("GoCardless token response is missing an access token.");
    }

    return token.access;
  }
}
