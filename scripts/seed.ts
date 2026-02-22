import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { dayjs } from "../lib/dayjs";
import type { EntryPayload } from "../lib/entries/types";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

loadEnv({ path: path.join(projectRoot, ".env.local") });
loadEnv({ path: path.join(projectRoot, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local or .env");
}

async function loadDeps() {
  const [{ hashPassword }, { db }, schemaModule, encryptionModule] = await Promise.all([
    import("../lib/auth/password"),
    import("../lib/db"),
    import("../lib/db/schema"),
    import("../lib/entries/encryption"),
  ]);

  return {
    hashPassword,
    db,
    entries: schemaModule.entries,
    users: schemaModule.users,
    encryptEntryPayload: encryptionModule.encryptEntryPayload,
    getUserDek: encryptionModule.getUserDek,
  };
}

const TEST_USER = {
  email: "test@test.pl",
  login: "test@test.pl",
  password: "test123",
  firstName: "Test",
  lastName: "Admin",
} as const;

const CLOSED_HOLD_DAYS = [8, 11, 14, 18, 21, 9, 13, 17] as const;
const CLOSED_ASSETS = ["BTC", "ETH", "BTC", "ETH", "BTC", "ETH", "BTC", "ETH"] as const;
const CLOSED_QUOTES = ["USD", "EUR", "PLN", "USD", "EUR", "PLN", "EUR", "USD"] as const;
const OPEN_ASSETS = ["SOL", "SOL", "SOL", "SOL"] as const;
const OPEN_QUOTES = ["USD", "EUR", "PLN", "USD"] as const;

const BUY_PRICES_BY_ASSET: Record<string, number[]> = {
  BTC: [61200, 62850, 60320, 64600],
  ETH: [3120, 3260, 2990, 3375],
  SOL: [142, 156, 149, 167],
};

const QUANTITY_BY_ASSET: Record<string, number[]> = {
  BTC: [0.042, 0.038, 0.051, 0.033],
  ETH: [0.82, 0.91, 1.05, 0.73],
  SOL: [12.5, 16.2, 14.8, 18.1],
};

const PROFIT_PCT = [5.2, 8.6, 4.4, 10.8, 6.1, 9.4, 7.3, 11.2] as const;
const COMMISSION_RATE = 0.0015;

const NBP_RATE_BY_QUOTE: Record<string, number[]> = {
  PLN: [1],
  USD: [3.91, 3.97, 4.04, 3.88],
  EUR: [4.25, 4.33, 4.39, 4.28],
};

const fixed = (value: number, decimals: number) => value.toFixed(decimals);

function buildPayload(input: {
  operation: "BUY" | "SELL";
  baseAsset: string;
  quoteCurrency: string;
  quantity: number;
  pricePerUnit: number;
  commission: number;
  tradeDate: Date;
  source: string;
  note: string;
}): EntryPayload {
  const gross = input.quantity * input.pricePerUnit;
  const fullPrice =
    input.operation === "BUY" ? gross + input.commission : gross - input.commission;
  const rateSet = NBP_RATE_BY_QUOTE[input.quoteCurrency] ?? [1];
  const rate = rateSet[dayjs.utc(input.tradeDate).date() % rateSet.length] ?? 1;
  const valuePln = fullPrice * rate;

  return {
    operation: input.operation,
    baseAsset: input.baseAsset,
    quoteCurrency: input.quoteCurrency,
    quantity: fixed(input.quantity, 12),
    pricePerUnit: fixed(input.pricePerUnit, 12),
    fullPrice: fixed(fullPrice, 12),
    commission: fixed(input.commission, 12),
    source: input.source,
    note: input.note,
    nbpRateDate: dayjs.utc(input.tradeDate).format("YYYY-MM-DD"),
    nbpRate: fixed(rate, 6),
    valuePln: fixed(valuePln, 2),
  };
}

type SeedDeps = Awaited<ReturnType<typeof loadDeps>>;

async function ensureTestAdminUser(deps: SeedDeps) {
  const passwordHash = await deps.hashPassword(TEST_USER.password);
  const [existing] = await deps.db
    .select()
    .from(deps.users)
    .where(eq(deps.users.email, TEST_USER.email))
    .limit(1);

  if (existing) {
    const [updated] = await deps.db
      .update(deps.users)
      .set({
        login: TEST_USER.login,
        passwordHash,
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
        role: "admin",
        deletedAt: null,
        updatedAt: dayjs.utc().toDate(),
      })
      .where(eq(deps.users.id, existing.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update existing test user.");
    }

    return updated;
  }

  const [created] = await deps.db
    .insert(deps.users)
    .values({
      email: TEST_USER.email,
      login: TEST_USER.login,
      passwordHash,
      firstName: TEST_USER.firstName,
      lastName: TEST_USER.lastName,
      role: "admin",
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create test user.");
  }

  return created;
}

async function seedTransactions(userId: string, deps: SeedDeps) {
  await deps.db.delete(deps.entries).where(eq(deps.entries.userId, userId));

  const dek = await deps.getUserDek(userId);
  const now = dayjs.utc();

  const rows: Array<typeof deps.entries.$inferInsert> = [];

  for (let index = 0; index < 8; index += 1) {
    const asset = CLOSED_ASSETS[index] ?? "BTC";
    const quote = CLOSED_QUOTES[index] ?? "USD";
    const holdDays = CLOSED_HOLD_DAYS[index] ?? 10;
    const profitPct = PROFIT_PCT[index] ?? 6;

    const buyDate = now.subtract(75 - index * 5, "day").toDate();
    const sellDate = dayjs.utc(buyDate).add(holdDays, "day").toDate();

    const buyPricePool = BUY_PRICES_BY_ASSET[asset] ?? [100];
    const quantityPool = QUANTITY_BY_ASSET[asset] ?? [1];

    const buyPrice = buyPricePool[index % buyPricePool.length] ?? 100;
    const quantity = quantityPool[index % quantityPool.length] ?? 1;
    const buyCommission = buyPrice * quantity * COMMISSION_RATE;
    const sellPrice = buyPrice * (1 + profitPct / 100);
    const sellCommission = sellPrice * quantity * COMMISSION_RATE;

    const buyPayload = buildPayload({
      operation: "BUY",
      baseAsset: asset,
      quoteCurrency: quote,
      quantity,
      pricePerUnit: buyPrice,
      commission: buyCommission,
      tradeDate: buyDate,
      source: "Seeded market order",
      note: `Opened ${asset} position (${quote})`,
    });

    const sellPayload = buildPayload({
      operation: "SELL",
      baseAsset: asset,
      quoteCurrency: quote,
      quantity,
      pricePerUnit: sellPrice,
      commission: sellCommission,
      tradeDate: sellDate,
      source: "Seeded take-profit",
      note: `Closed ${asset} after ${holdDays} days (+${profitPct.toFixed(1)}%)`,
    });

    rows.push({
      userId,
      date: buyDate,
      encryptedPayload: deps.encryptEntryPayload(buyPayload, dek),
    });

    rows.push({
      userId,
      date: sellDate,
      encryptedPayload: deps.encryptEntryPayload(sellPayload, dek),
    });
  }

  for (let index = 0; index < 4; index += 1) {
    const asset = OPEN_ASSETS[index] ?? "SOL";
    const quote = OPEN_QUOTES[index] ?? "USD";
    const buyDate = now.subtract(12 - index * 3, "day").toDate();
    const buyPricePool = BUY_PRICES_BY_ASSET[asset] ?? [100];
    const quantityPool = QUANTITY_BY_ASSET[asset] ?? [1];
    const buyPrice = buyPricePool[index % buyPricePool.length] ?? 100;
    const quantity = quantityPool[(index + 1) % quantityPool.length] ?? 1;
    const buyCommission = buyPrice * quantity * COMMISSION_RATE;

    const buyPayload = buildPayload({
      operation: "BUY",
      baseAsset: asset,
      quoteCurrency: quote,
      quantity,
      pricePerUnit: buyPrice,
      commission: buyCommission,
      tradeDate: buyDate,
      source: "Seeded swing position",
      note: `Open ${asset} position (${quote})`,
    });

    rows.push({
      userId,
      date: buyDate,
      encryptedPayload: deps.encryptEntryPayload(buyPayload, dek),
    });
  }

  await deps.db.insert(deps.entries).values(rows);
}

async function main() {
  const deps = await loadDeps();
  const user = await ensureTestAdminUser(deps);
  await seedTransactions(user.id, deps);

  console.log("Seed complete:");
  console.log(`- user: ${TEST_USER.email}`);
  console.log("- role: admin");
  console.log("- entries: 20 (12 BUY + 8 SELL)");
  console.log("- open assets: SOL");
  console.log("- closed assets: BTC, ETH");
}

main().catch((error: unknown) => {
  console.error("Seed failed", error);
  process.exit(1);
});
