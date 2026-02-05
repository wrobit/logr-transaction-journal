import { fetchJsonWithRetry } from "@/lib/integrations/http";
import type { RateProvider, RateProviderInput } from "@/lib/integrations/providers/interfaces";
import type { NormalizedRateResult } from "@/lib/integrations/types";
import { normalizeCurrency, normalizeIsoDate, nowIso } from "@/lib/integrations/utils";

type HmrcRatePayload = {
  period?: string;
  rates?: Array<{ currencyCode: string; rate: number }>;
};

const HMRC_API_BASE = process.env.HMRC_RATES_API_BASE ?? "https://api.service.hmrc.gov.uk/misc/exchange-rates";

export class HmrcRateProvider implements RateProvider {
  readonly name = "hmrc" as const;

  async getRate(input: RateProviderInput): Promise<NormalizedRateResult | null> {
    const effectiveDate = normalizeIsoDate(input.effectiveDate);
    const baseCurrency = normalizeCurrency(input.baseCurrency);
    const quoteCurrency = normalizeCurrency(input.quoteCurrency);

    const month = effectiveDate.slice(0, 7);
    const endpoint = `${HMRC_API_BASE}?period=${month}`;
    const payload = await fetchJsonWithRetry<HmrcRatePayload>(endpoint, {}, { retries: 1 }).catch(
      () => null,
    );

    if (!payload?.rates || payload.rates.length === 0) {
      return null;
    }

    const gbpPerBase = this.getGbpPerCurrency(baseCurrency, payload.rates);
    const gbpPerQuote = this.getGbpPerCurrency(quoteCurrency, payload.rates);

    if (gbpPerBase === null || gbpPerQuote === null || gbpPerQuote === 0) {
      return null;
    }

    return {
      provider: this.name,
      baseCurrency,
      quoteCurrency,
      rateValue: gbpPerBase / gbpPerQuote,
      effectiveDate,
      publishedAt: payload.period ? `${payload.period}-01T00:00:00.000Z` : null,
      retrievedAt: nowIso(),
      rateType: input.rateType,
      method: "official_publication",
      rawSnapshot: payload,
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

  private getGbpPerCurrency(currency: string, rates: Array<{ currencyCode: string; rate: number }>) {
    if (currency === "GBP") {
      return 1;
    }

    const row = rates.find((rate) => rate.currencyCode.toUpperCase() === currency);
    if (!row || typeof row.rate !== "number" || row.rate === 0) {
      return null;
    }

    return 1 / row.rate;
  }
}
