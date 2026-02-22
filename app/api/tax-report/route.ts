import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/options";
import { ensureUserId } from "@/lib/auth/users";
import { generateTaxReport } from "@/lib/tax/report";

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

  return NextResponse.json(report);
}
