type TranslateFn = (key: string) => string;

const VALIDATION_MESSAGE_KEYS: Record<string, string> = {
  "First name is required.": "validation.firstNameRequired",
  "Last name is required.": "validation.lastNameRequired",
  "Login must be at least 3 characters.": "validation.loginMin",
  "Email must be valid.": "validation.emailValid",
  "Type DELETE to confirm.": "validation.typeDelete",
  "Date is required.": "validation.dateRequired",
  "Asset is required.": "validation.assetRequired",
  "Quote currency is required.": "validation.quoteCurrencyRequired",
};

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  "You must be signed in to update your profile.": "errors.authRequiredProfileUpdate",
  "You must be signed in to add entries.": "errors.authRequiredEntryCreate",
  "You must be signed in to edit entries.": "errors.authRequiredEntryUpdate",
  "You must be signed in to delete entries.": "errors.authRequiredEntryDelete",
  "User record missing. Please sign in again.": "errors.userMissing",
  "Email is already in use.": "errors.emailInUse",
  "Login is already in use.": "errors.loginInUse",
  "Profile not found.": "errors.profileNotFound",
  "Entry id is missing.": "errors.entryIdMissing",
  "Entry not found.": "errors.entryNotFound",
  "Failed to create entry.": "errors.entryCreateFailed",
};

export function translateValidationMessage(message: string, t: TranslateFn) {
  const key = VALIDATION_MESSAGE_KEYS[message];
  return key ? t(key) : message;
}

export function translateErrorMessage(message: string, t: TranslateFn) {
  const key = ERROR_MESSAGE_KEYS[message];
  return key ? t(key) : message;
}
