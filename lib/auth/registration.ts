export function isPublicRegistrationEnabled() {
  if (process.env.VERCEL_ENV !== "production") {
    return true;
  }

  return process.env.PUBLIC_REGISTRATION_ENABLED === "true";
}
