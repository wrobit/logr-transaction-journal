type IntegrationAlertSeverity = "warning" | "error";

export type IntegrationAlertCode =
  | "rate_provider_downtime"
  | "stale_rate_used"
  | "rate_fallback_used"
  | "bank_provider_downtime";

export type IntegrationAlertEvent = {
  code: IntegrationAlertCode;
  severity: IntegrationAlertSeverity;
  message: string;
  context: Record<string, string | number | boolean | null | undefined>;
  createdAt: string;
};

export function emitIntegrationAlert(event: Omit<IntegrationAlertEvent, "createdAt">) {
  const payload: IntegrationAlertEvent = {
    ...event,
    createdAt: new Date().toISOString(),
  };

  const sink = event.severity === "error" ? console.error : console.warn;
  sink("[integration-alert]", payload.code, payload.message, payload.context);
}
