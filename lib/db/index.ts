import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

const resolvedDatabaseUrl =
  databaseUrl ??
  (process.env.NODE_ENV === "test" ? "postgres://test:test@localhost:5432/test" : null);

if (!resolvedDatabaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: resolvedDatabaseUrl,
  max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
});

if (process.env.VERCEL) {
  attachDatabasePool(pool);
}

export const db = drizzle(pool, { schema });
export { pool as dbPool };
