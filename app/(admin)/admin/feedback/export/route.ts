import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin";
import { parseAdminFeedbackQuery } from "@/lib/admin/feedback-query";
import { getAdminFeedbackExportRows } from "@/actions/admin-feedback";
import { getFeedbackReasonLabel } from "@/lib/admin/feedback-helpers";
import { dayjs } from "@/lib/dayjs";
import { csvEscape } from "@/lib/export/csv";
import { SENSITIVE_RESPONSE_HEADERS } from "@/lib/http/headers";

export async function GET(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const query = parseAdminFeedbackQuery(params);
  const rows = await getAdminFeedbackExportRows(query);

  const header = ["Date", "Reason", "Notes", "Email", "Login"].join(",");
  const lines = rows.map((row) => {
    const values = [
      dayjs.utc(row.createdAt).format("YYYY-MM-DD HH:mm"),
      getFeedbackReasonLabel(row.reason),
      row.notes ?? "",
      row.userEmail ?? "",
      row.userLogin ?? "",
    ];
    return values.map(csvEscape).join(",");
  });

  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=entry-feedback.csv",
      ...SENSITIVE_RESPONSE_HEADERS,
    },
  });
}
