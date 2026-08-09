export const cookieConsentName = "logr_cookie_consent";
export const cookieConsentAccepted = "accepted";
export const cookieConsentRejected = "rejected";

export type CookieConsentValue =
  | typeof cookieConsentAccepted
  | typeof cookieConsentRejected;

export const isCookieConsentValue = (
  value: string | null | undefined,
): value is CookieConsentValue =>
  value === cookieConsentAccepted || value === cookieConsentRejected;
