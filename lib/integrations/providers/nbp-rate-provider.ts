import { dayjs } from "@/lib/dayjs";
import { getNbpRate } from "@/lib/nbp";
import type { RateProvider, RateProviderInput } from "@/lib/integrations/providers/interfaces";
import type { NormalizedRateResult } from "@/lib/integrations/types";
import { normalizeCurrency, normalizeIsoDate, nowIso } from "@/lib/integrations/utils";

export class NbpRateProvider implements RateProvider {
  readonly name = "nbp" as const;

  async getRate(input: RateProviderInput): Promise<NormalizedRateResult | null> {
    const baseCurrency = normalizeCurrency(input.baseCurrency);
    const quoteCurrency = normalizeCurrency(input.quoteCurrency);
    const effectiveDate = normalizeIsoDate(input.effectiveDate);

    if (baseCurrency === quoteCurrency) {
      return {
        provider: this.name,
        baseCurrency,
        quoteCurrency,
        rateValue: 1,
        effectiveDate,
        publishedAt: `${effectiveDate}T00:00:00.000Z`,
        retrievedAt: nowIso(),
        rateType: input.rateType,
        method: "official_publication",
        rawSnapshot: { direct: true },
      };
    }

    const entryDate = dayjs.utc(effectiveDate).toDate();
    const baseToPln = await getNbpRate(baseCurrency, entryDate);
    const quoteToPln = await getNbpRate(quoteCurrency, entryDate);

    if (quoteToPln.rate === 0) {
      return null;
    }

    const effective = dayjs
      .utc(baseToPln.rateDate > quoteToPln.rateDate ? baseToPln.rateDate : quoteToPln.rateDate)
      .format("YYYY-MM-DD");

    return {
      provider: this.name,
      baseCurrency,
      quoteCurrency,
      rateValue: baseToPln.rate / quoteToPln.rate,
      effectiveDate: effective,
      publishedAt: `${effective}T00:00:00.000Z`,
      retrievedAt: nowIso(),
      rateType: input.rateType,
      method: "official_publication",
      rawSnapshot: {
        baseToPln,
        quoteToPln,
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
}
