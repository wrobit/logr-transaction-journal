import { fetchJsonWithRetry } from "@/lib/integrations/http";
import type { RateProvider, RateProviderInput } from "@/lib/integrations/providers/interfaces";
import type { NormalizedRateResult } from "@/lib/integrations/types";
import { normalizeCurrency, normalizeIsoDate, nowIso } from "@/lib/integrations/utils";

const ECB_BASE_URL = "https://data-api.ecb.europa.eu/service/data/EXR";

export class EcbRateProvider implements RateProvider {
  readonly name = "ecb" as const;

  async getRate(input: RateProviderInput): Promise<NormalizedRateResult | null> {
    const effectiveDate = normalizeIsoDate(input.effectiveDate);
    const baseCurrency = normalizeCurrency(input.baseCurrency);
    const quoteCurrency = normalizeCurrency(input.quoteCurrency);

    const eurPerBase = await this.getEurPerCurrency(baseCurrency, effectiveDate);
    const eurPerQuote = await this.getEurPerCurrency(quoteCurrency, effectiveDate);

    if (eurPerBase === null || eurPerQuote === null || eurPerQuote === 0) {
      return null;
    }

    const rateValue = eurPerBase / eurPerQuote;
    const retrievedAt = nowIso();

    return {
      provider: this.name,
      baseCurrency,
      quoteCurrency,
      rateValue,
      effectiveDate,
      publishedAt: `${effectiveDate}T16:00:00.000Z`,
      retrievedAt,
      rateType: input.rateType,
      method: "official_publication",
      rawSnapshot: {
        eurPerBase,
        eurPerQuote,
      },
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

  private async getEurPerCurrency(currency: string, date: string) {
    if (currency === "EUR") {
      return 1;
    }

    const endpoint = `${ECB_BASE_URL}/D.${currency}.EUR.SP00.A?startPeriod=${date}&endPeriod=${date}&format=jsondata`;
    const payload = await fetchJsonWithRetry<unknown>(endpoint, {}, { retries: 1 }).catch(
      () => null,
    );

    if (!payload) {
      return null;
    }

    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    const dataSets = (payload as { dataSets?: Array<{ series?: Record<string, unknown> }> }).dataSets;
    const series = dataSets?.[0]?.series;
    if (!series) {
      return null;
    }

    const firstSeries = Object.values(series)[0];
    if (!firstSeries || typeof firstSeries !== "object") {
      return null;
    }

    const observations = (firstSeries as { observations?: Record<string, number[]> }).observations;
    if (!observations) {
      return null;
    }

    const observation = Object.values(observations)[0];
    if (!observation || !Array.isArray(observation) || observation.length === 0) {
      return null;
    }

    const rate = observation[0];
    return typeof rate === "number" ? rate : null;
  }
}
