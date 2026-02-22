import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/options";
import { ensureUserId } from "@/lib/auth/users";
import { getRequestLocale } from "@/lib/i18n/translate";
import { renderTaxReportPdf } from "@/lib/tax/pdf";
import { generateTaxReport } from "@/lib/tax/report";

export const runtime = "nodejs";

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

  const locale = await getRequestLocale();
  const pdfBuffer = await renderTaxReportPdf(report, locale);
  const filename = `pit-helper-${report.year ?? "all"}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
