import type {
  TaxValidationInput,
  TaxValidationProvider,
} from "@/lib/integrations/providers/interfaces";
import type { NormalizedTaxValidationResult } from "@/lib/integrations/types";
import { maskIdentifier, nowIso } from "@/lib/integrations/utils";

const VIES_ENDPOINT = "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

export class ViesTaxValidationProvider implements TaxValidationProvider {
  readonly name = "vies" as const;

  async validate(input: TaxValidationInput): Promise<NormalizedTaxValidationResult> {
    const countryCode = input.countryCode.toUpperCase();
    const vatValue = input.value.replace(/\s+/g, "");
    const checkedAt = nowIso();
    const body = buildViesRequestBody(countryCode, vatValue);

    try {
      const response = await fetch(VIES_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "checkVat",
        },
        body,
      });

      if (!response.ok) {
        return {
          provider: this.name,
          countryCode,
          idType: input.idType,
          value: vatValue,
          maskedValue: maskIdentifier(vatValue),
          status: "unavailable",
          checkedAt,
          rawSnapshot: { status: response.status },
        };
      }

      const xml = await response.text();
      const valid = /<valid>true<\/valid>/i.test(xml);

      return {
        provider: this.name,
        countryCode,
        idType: input.idType,
        value: vatValue,
        maskedValue: maskIdentifier(vatValue),
        status: valid ? "valid" : "invalid",
        checkedAt,
        rawSnapshot: { valid },
      };
    } catch {
      return {
        provider: this.name,
        countryCode,
        idType: input.idType,
        value: vatValue,
        maskedValue: maskIdentifier(vatValue),
        status: "timeout",
        checkedAt,
        rawSnapshot: null,
      };
    }
  }
}

function buildViesRequestBody(countryCode: string, vatNumber: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>${countryCode}</countryCode>
      <vatNumber>${vatNumber}</vatNumber>
    </checkVat>
  </soap:Body>
</soap:Envelope>`;
}
