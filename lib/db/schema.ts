import {
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

export const entryOperationEnum = pgEnum("entry_operation", ["BUY", "SELL"]);
export const feedbackReasonEnum = pgEnum("feedback_reason", [
  "tracking_elsewhere",
  "no_longer_needed",
  "missing_features",
  "too_complex",
  "privacy",
  "other",
]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

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
    passwordHash: text("password_hash").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    encryptionKeyEncrypted: jsonb("encryption_key_encrypted").$type<EncryptedBlob>(),
    encryptionVersion: integer("encryption_version").notNull().default(1),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => ({
    roleIndex: index("users_role_idx").on(table.role),
    lastLoginAtIndex: index("users_last_login_at_idx").on(table.lastLoginAt),
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
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => ({
    userDateIndex: index("entries_user_date_idx").on(table.userId, table.date),
  }),
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
    currencyRateDateIndex: uniqueIndex(
      "fx_rates_cache_currency_rate_date_idx",
    ).on(table.currency, table.rateDate),
  }),
);

export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  reason: feedbackReasonEnum("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    actorIndex: index("admin_audit_actor_idx").on(table.actorUserId),
    targetIndex: index("admin_audit_target_idx").on(table.targetUserId),
    createdAtIndex: index("admin_audit_created_at_idx").on(table.createdAt),
    actionIndex: index("admin_audit_action_idx").on(table.action),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

export type FxRateCache = typeof fxRatesCache.$inferSelect;
export type NewFxRateCache = typeof fxRatesCache.$inferInsert;

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
