import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

const resolvedDatabaseUrl =
  databaseUrl ??
  (process.env.NODE_ENV === "test"
    ? "postgres://test:test@localhost:5432/test"
    : null);

if (!resolvedDatabaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(resolvedDatabaseUrl);

export const db = drizzle(sql, { schema });
