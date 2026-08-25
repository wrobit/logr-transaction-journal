import { db } from "@/lib/db";
import { taxValidationLogs } from "@/lib/db/schema";
import { resolveTaxValidationProvidersForCountry } from "@/lib/integrations/providers/registry";
import { hashSnapshot, maskIdentifier } from "@/lib/integrations/utils";

export async function validateTaxIdentifier(input: {
  countryCode: string;
  idType: string;
  value: string;
}) {
  const providers = await resolveTaxValidationProvidersForCountry(input.countryCode);

  for (const provider of providers) {
    const result = await provider.validate(input);

    await db.insert(taxValidationLogs).values({
      countryCode: result.countryCode,
      idType: result.idType,
      identifierHash: hashSnapshot(result.value.trim().normalize("NFKC").toUpperCase()),
      result: result.status,
      providerName: result.provider,
      checkedAt: new Date(result.checkedAt),
      responseHash: hashSnapshot(result.rawSnapshot),
    });

    if (result.status !== "unavailable" && result.status !== "timeout") {
      return result;
    }
  }

  return {
    provider: "vies",
    countryCode: input.countryCode.toUpperCase(),
    idType: input.idType,
    value: input.value,
    maskedValue: maskIdentifier(input.value),
    status: "unavailable",
    checkedAt: new Date().toISOString(),
    rawSnapshot: null,
  } as const;
}
