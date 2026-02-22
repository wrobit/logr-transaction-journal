import { fetchJsonWithRetry } from "@/lib/integrations/http";
import { dayjs } from "@/lib/dayjs";
import type { RateProvider, RateProviderInput } from "@/lib/integrations/providers/interfaces";
import type { NormalizedRateResult } from "@/lib/integrations/types";
import { normalizeCurrency, normalizeIsoDate, nowIso } from "@/lib/integrations/utils";

const ECB_BASE_URL = "https://data-api.ecb.europa.eu/service/data/EXR";
const MAX_LOOKBACK_DAYS = 7;

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

    for (let offset = 0; offset <= MAX_LOOKBACK_DAYS; offset += 1) {
      const candidateDate = dayjs.utc(date).subtract(offset, "day").format("YYYY-MM-DD");
      const endpoint = `${ECB_BASE_URL}/D.${currency}.EUR.SP00.A?startPeriod=${candidateDate}&endPeriod=${candidateDate}&format=jsondata`;
      const payload = await fetchJsonWithRetry<unknown>(endpoint, {}, { retries: 1 }).catch(
        () => null,
      );

      if (!payload || typeof payload !== "object") {
        continue;
      }

      const dataSets = (payload as { dataSets?: Array<{ series?: Record<string, unknown> }> }).dataSets;
      const series = dataSets?.[0]?.series;
      if (!series) {
        continue;
      }

      const firstSeries = Object.values(series)[0];
      if (!firstSeries || typeof firstSeries !== "object") {
        continue;
      }

      const observations = (firstSeries as { observations?: Record<string, number[]> }).observations;
      if (!observations) {
        continue;
      }

      const observation = Object.values(observations)[0];
      if (!observation || !Array.isArray(observation) || observation.length === 0) {
        continue;
      }

      const rate = observation[0];
      if (typeof rate === "number") {
        return rate;
      }
    }

    return null;
  }
}
