import { fetchJsonWithRetry } from "@/lib/integrations/http";
import type { RateProvider, RateProviderInput } from "@/lib/integrations/providers/interfaces";
import type { NormalizedRateResult } from "@/lib/integrations/types";
import { normalizeCurrency, normalizeIsoDate, nowIso } from "@/lib/integrations/utils";

type BocObservationPayload = {
  observations?: Array<Record<string, { v?: string }>>;
};

const BOC_API_BASE = "https://www.bankofcanada.ca/valet/observations";

export class BocRateProvider implements RateProvider {
  readonly name = "boc" as const;

  async getRate(input: RateProviderInput): Promise<NormalizedRateResult | null> {
    const effectiveDate = normalizeIsoDate(input.effectiveDate);
    const baseCurrency = normalizeCurrency(input.baseCurrency);
    const quoteCurrency = normalizeCurrency(input.quoteCurrency);

    const cadPerBase = await this.getCadPerCurrency(baseCurrency, effectiveDate);
    const cadPerQuote = await this.getCadPerCurrency(quoteCurrency, effectiveDate);

    if (cadPerBase === null || cadPerQuote === null || cadPerQuote === 0) {
      return null;
    }

    return {
      provider: this.name,
      baseCurrency,
      quoteCurrency,
      rateValue: cadPerBase / cadPerQuote,
      effectiveDate,
      publishedAt: `${effectiveDate}T16:00:00.000Z`,
      retrievedAt: nowIso(),
      rateType: input.rateType,
      method: "official_publication",
      rawSnapshot: { cadPerBase, cadPerQuote },
    };
  }

  async getLatest(
    input: Omit<RateProviderInput, "effectiveDate" | "rateType">,
  ): Promise<NormalizedRateResult | null> {
    return this.getRate({
      ...input,
      effectiveDate: nowIso(),
      rateType: "latest",
    });
  }

  getMetadata() {
    return {
      provider: this.name,
      supportsHistorical: true,
      supportsLatest: true,
    };
  }

  private async getCadPerCurrency(currency: string, effectiveDate: string) {
    if (currency === "CAD") {
      return 1;
    }

    const series = `FX${currency}CAD`;
    const endpoint = `${BOC_API_BASE}/${series}/json?start_date=${effectiveDate}&end_date=${effectiveDate}`;
    const payload = await fetchJsonWithRetry<BocObservationPayload>(endpoint, {}, { retries: 1 }).catch(
      () => null,
    );

    const row = payload?.observations?.[0]?.[series];
    const value = row?.v ? Number(row.v) : null;

    if (value === null || Number.isNaN(value) || value === 0) {
      return null;
    }

    return value;
  }
}
