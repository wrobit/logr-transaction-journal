import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const entryOperationEnum = pgEnum("entry_operation", ["BUY", "SELL"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "date" }).notNull(),
    operation: entryOperationEnum("operation").notNull(),
    baseAsset: text("base_asset").notNull(),
    quoteCurrency: text("quote_currency").notNull(),
    quantity: numeric("quantity", { precision: 30, scale: 12 }).notNull(),
    pricePerUnit: numeric("price_per_unit", { precision: 30, scale: 12 }).notNull(),
    fullPrice: numeric("full_price", { precision: 30, scale: 12 }).notNull(),
    commission: numeric("commission", { precision: 30, scale: 12 }),
    source: text("source"),
    note: text("note"),
    nbpRateDate: date("nbp_rate_date", { mode: "date" }).notNull(),
    nbpRate: numeric("nbp_rate", { precision: 18, scale: 6 }).notNull(),
    valuePln: numeric("value_pln", { precision: 30, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userDateIndex: index("entries_user_date_idx").on(table.userId, table.date),
    userAssetIndex: index("entries_user_asset_idx").on(
      table.userId,
      table.baseAsset,
    ),
    userOperationIndex: index("entries_user_operation_idx").on(
      table.userId,
      table.operation,
    ),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

export type FxRateCache = typeof fxRatesCache.$inferSelect;
export type NewFxRateCache = typeof fxRatesCache.$inferInsert;
