import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/options";
import { ensureUserId } from "@/lib/auth/users";
import { generateTaxReport } from "@/lib/tax/report";

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await ensureUserId(session?.user ?? {});

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const parsedYear = yearParam ? Number(yearParam) : undefined;

  if (
    yearParam
    && (parsedYear === undefined
      || !Number.isInteger(parsedYear)
      || parsedYear < 2009
      || parsedYear > 2100)
  ) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const report = await generateTaxReport({
    userId,
    year: parsedYear,
  });

  const header = [
    "Date",
    "Operation",
    "Asset",
    "QuoteCurrency",
    "Quantity",
    "PricePerUnit",
    "FullPrice",
    "Commission",
    "ValuePLN",
    "RateValue",
    "RateEffectiveDate",
    "RateProvider",
    "RateMethod",
    "RateSource",
    "RateWarnings",
    "EntryId",
  ].join(",");

  const lines = report.rows.map((row) => {
    const values = [
      row.date,
      row.operation,
      row.baseAsset,
      row.quoteCurrency,
      row.quantity,
      row.pricePerUnit,
      row.fullPrice,
      row.commission ?? "",
      row.valuePln,
      row.rate.value,
      row.rate.effectiveDate,
      row.rate.provider,
      row.rate.method,
      row.rate.source,
      row.rate.warnings.join(" | "),
      row.entryId,
    ];

    return values.map((value) => csvEscape(String(value))).join(",");
  });

  const csv = [header, ...lines].join("\n");
  const filename = `pit-helper-${report.year ?? "all"}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
