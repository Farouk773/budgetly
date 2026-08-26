import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { buildMonthlyPdfReport } from "@/backend/export/pdf";
import { currentMonthValue } from "@/backend/queries/balance";
import { getMonthlyReportData } from "@/backend/queries/report";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const monthParam = request.nextUrl.searchParams.get("month");
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : currentMonthValue();

  const data = await getMonthlyReportData(user.id, month);
  const buffer = await buildMonthlyPdfReport(data, user.currency);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bilan-${month}.pdf"`,
    },
  });
}
