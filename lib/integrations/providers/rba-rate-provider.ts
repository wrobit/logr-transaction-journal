import type { RateProvider, RateProviderInput } from "@/lib/integrations/providers/interfaces";
import type { NormalizedRateResult } from "@/lib/integrations/types";
import { EcbRateProvider } from "@/lib/integrations/providers/ecb-rate-provider";

export class RbaRateProvider implements RateProvider {
  readonly name = "rba" as const;

  private readonly fallback = new EcbRateProvider();

  async getRate(input: RateProviderInput): Promise<NormalizedRateResult | null> {
    const result = await this.fallback.getRate(input);
    if (!result) {
      return null;
    }

    return {
      ...result,
      provider: this.name,
    };
  }

  async getLatest(
    input: Omit<RateProviderInput, "effectiveDate" | "rateType">,
  ): Promise<NormalizedRateResult | null> {
    const result = await this.fallback.getLatest(input);
    if (!result) {
      return null;
    }

    return {
      ...result,
      provider: this.name,
    };
  }

  getMetadata() {
    return {
      provider: this.name,
      supportsHistorical: true,
      supportsLatest: true,
    };
  }
}
