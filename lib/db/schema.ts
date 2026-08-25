import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const feedbackReasonEnum = pgEnum("feedback_reason", [
  "tracking_elsewhere",
  "no_longer_needed",
  "missing_features",
  "too_complex",
  "privacy",
  "other",
]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const displayCurrencyEnum = pgEnum("display_currency", ["PLN", "EUR", "USD"]);
export const integrationProviderTypeEnum = pgEnum("integration_provider_type", [
  "rate",
  "tax_validation",
  "bank_import",
]);

export type EncryptedBlob = {
  version: number;
  nonce: string;
  ciphertext: string;
  tag: string;
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    login: text("login").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    displayCurrency: displayCurrencyEnum("display_currency").notNull().default("PLN"),
    encryptionKeyEncrypted: jsonb("encryption_key_encrypted").$type<EncryptedBlob>(),
    encryptionVersion: integer("encryption_version").notNull().default(1),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => ({
    roleIndex: index("users_role_idx").on(table.role),
    lastLoginAtIndex: index("users_last_login_at_idx").on(table.lastLoginAt),
  })
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    providerEmail: text("provider_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerAccountUnique: uniqueIndex("oauth_accounts_provider_account_idx").on(
      table.provider,
      table.providerAccountId,
    ),
    userIndex: index("oauth_accounts_user_idx").on(table.userId),
  }),
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "date" }).notNull(),
    encryptedPayload: jsonb("encrypted_payload").$type<EncryptedBlob>().notNull(),
    encryptionVersion: integer("encryption_version").notNull().default(1),
    importBatchId: uuid("import_batch_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => ({
    userDateIndex: index("entries_user_date_idx").on(table.userId, table.date),
  })
);

export const fxRatesCache = pgTable(
  "fx_rates_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    currency: text("currency").notNull(),
    rateDate: date("rate_date", { mode: "date" }).notNull(),
    rate: numeric("rate", { precision: 18, scale: 6 }).notNull(),
  },
  (table) => ({
    currencyRateDateIndex: uniqueIndex("fx_rates_cache_currency_rate_date_idx").on(
      table.currency,
      table.rateDate
    ),
  })
);

export const fxProviderRates = pgTable(
  "fx_provider_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    baseCurrency: text("base_currency").notNull(),
    quoteCurrency: text("quote_currency").notNull(),
    effectiveDate: date("effective_date", { mode: "date" }).notNull(),
    rateValue: numeric("rate_value", { precision: 18, scale: 8 }).notNull(),
    sourceProvider: text("source_provider").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    rateType: text("rate_type").notNull(),
    method: text("method").notNull(),
    responseHash: text("response_hash"),
    rawSnapshot: jsonb("raw_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    lookupIndex: index("fx_provider_rates_lookup_idx").on(
      table.baseCurrency,
      table.quoteCurrency,
      table.effectiveDate,
      table.rateType,
    ),
    uniqueSnapshotIndex: uniqueIndex("fx_provider_rates_unique_snapshot_idx").on(
      table.baseCurrency,
      table.quoteCurrency,
      table.effectiveDate,
      table.sourceProvider,
      table.rateType,
      table.method,
      table.responseHash,
    ),
  }),
);

export const countryIntegrationPolicies = pgTable(
  "country_integration_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: text("country_code").notNull(),
    providerType: integrationProviderTypeEnum("provider_type").notNull(),
    providerName: text("provider_name").notNull(),
    priority: integer("priority").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    policyLookupIndex: uniqueIndex("country_integration_policy_idx").on(
      table.countryCode,
      table.providerType,
      table.providerName,
    ),
  }),
);

export const taxValidationLogs = pgTable(
  "tax_validation_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: text("country_code").notNull(),
    idType: text("id_type").notNull(),
    identifierHash: text("identifier_hash").notNull(),
    result: text("result").notNull(),
    providerName: text("provider_name").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true, mode: "date" }).notNull(),
    responseHash: text("response_hash"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    lookupIndex: index("tax_validation_logs_lookup_idx").on(
      table.countryCode,
      table.idType,
      table.providerName,
      table.checkedAt,
    ),
  }),
);

export const bankImportAuditBatches = pgTable(
  "bank_import_audit_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerName: text("provider_name").notNull(),
    accountRef: text("account_ref").notNull(),
    batchId: text("batch_id").notNull(),
    importedCount: integer("imported_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    batchLookupIndex: uniqueIndex("bank_import_audit_batch_idx").on(
      table.providerName,
      table.accountRef,
      table.batchId,
    ),
    userCreatedIndex: index("bank_import_audit_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const exchangeImportBatches = pgTable(
  "exchange_import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("completed"),
    totalRows: integer("total_rows").notNull().default(0),
    validRows: integer("valid_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    failedRows: integer("failed_rows").notNull().default(0),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIndex: index("exchange_import_batches_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export const exchangeImportRows = pgTable(
  "exchange_import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => exchangeImportBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    rowHash: text("row_hash").notNull(),
    status: text("status").notNull(),
    issues: jsonb("issues"),
    entryId: uuid("entry_id").references(() => entries.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    batchRowUnique: uniqueIndex("exchange_import_rows_batch_row_hash_idx").on(table.batchId, table.rowHash),
    batchStatusIndex: index("exchange_import_rows_batch_status_idx").on(table.batchId, table.status),
  }),
);

export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  reason: feedbackReasonEnum("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    actorIndex: index("admin_audit_actor_idx").on(table.actorUserId),
    targetIndex: index("admin_audit_target_idx").on(table.targetUserId),
    createdAtIndex: index("admin_audit_created_at_idx").on(table.createdAt),
    actionIndex: index("admin_audit_action_idx").on(table.action),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type OauthAccount = typeof oauthAccounts.$inferSelect;
export type NewOauthAccount = typeof oauthAccounts.$inferInsert;

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

export type FxRateCache = typeof fxRatesCache.$inferSelect;
export type NewFxRateCache = typeof fxRatesCache.$inferInsert;

export type FxProviderRate = typeof fxProviderRates.$inferSelect;
export type NewFxProviderRate = typeof fxProviderRates.$inferInsert;

export type CountryIntegrationPolicy = typeof countryIntegrationPolicies.$inferSelect;
export type NewCountryIntegrationPolicy = typeof countryIntegrationPolicies.$inferInsert;

export type TaxValidationLog = typeof taxValidationLogs.$inferSelect;
export type NewTaxValidationLog = typeof taxValidationLogs.$inferInsert;

export type BankImportAuditBatch = typeof bankImportAuditBatches.$inferSelect;
export type NewBankImportAuditBatch = typeof bankImportAuditBatches.$inferInsert;

export type ExchangeImportBatch = typeof exchangeImportBatches.$inferSelect;
export type NewExchangeImportBatch = typeof exchangeImportBatches.$inferInsert;

export type ExchangeImportRow = typeof exchangeImportRows.$inferSelect;
export type NewExchangeImportRow = typeof exchangeImportRows.$inferInsert;

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
