import { desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/options";
import { ensureUserId } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { getUserDek, resolveEntryPayload } from "@/lib/entries/encryption";
import { buildEntryWhere, parseEntryQuery } from "@/lib/entries/query";
import { serializeEntry } from "@/lib/entries/serialize";
import { csvEscape } from "@/lib/export/csv";
import { SENSITIVE_RESPONSE_HEADERS } from "@/lib/http/headers";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await ensureUserId(session?.user ?? {});

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const query = parseEntryQuery(params);
  const whereClause = buildEntryWhere(userId, query.filters);

  const rows = await db
    .select()
    .from(entries)
    .where(whereClause)
    .orderBy(desc(entries.date));

  const dek = await getUserDek(userId);

  const resolved = await Promise.all(
    rows.map(async (row) => {
      const payload = await resolveEntryPayload(row, dek);
      return serializeEntry(row, payload);
    }),
  );

  const filtered = resolved.filter((entry) => {
    if (query.filters.asset && entry.baseAsset !== query.filters.asset) {
      return false;
    }

    if (query.filters.operation && entry.operation !== query.filters.operation) {
      return false;
    }

    return true;
  });

  const header = [
    "Date",
    "Operation",
    "BaseAsset",
    "QuoteCurrency",
    "Quantity",
    "PricePerUnit",
    "FullPrice",
    "Commission",
    "Source",
    "NbpRateDate",
    "NbpRate",
    "ValuePLN",
    "Note",
    "EntryId",
  ].join(",");

  const lines = filtered.map((entry) => {
    const values = [
      entry.date,
      entry.operation,
      entry.baseAsset,
      entry.quoteCurrency,
      entry.quantity,
      entry.pricePerUnit,
      entry.fullPrice,
      entry.commission ?? "",
      entry.source ?? "",
      entry.nbpRateDate,
      entry.nbpRate,
      entry.valuePln,
      entry.note ?? "",
      entry.id,
    ];

    return values.map(csvEscape).join(",");
  });

  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=entries-export.csv",
      ...SENSITIVE_RESPONSE_HEADERS,
    },
  });
}
