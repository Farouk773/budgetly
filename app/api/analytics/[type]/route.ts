import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import {
  getChargesAnalytics,
  getDepensesAnalytics,
  getEpargneAnalytics,
  getPretAnalytics,
  getRevenuAnalytics,
} from "@/backend/queries/analytics";
import { analyticsQuerySchema, analyticsTypeSchema } from "@/backend/validations/analytics";
import type { AnalyticsResponse } from "@/backend/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { type: rawType } = await params;
  const typeParsed = analyticsTypeSchema.safeParse(rawType);
  if (!typeParsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }
  const type = typeParsed.data;

  const queryParsed = analyticsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  if (!queryParsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }
  const { granularite, month, loanId } = queryParsed.data;

  // `granularite=jour` is only meaningful for the "depenses" curve — every
  // other type only ever returns a monthly series (see ANALYTICS_PLAN.md §2).
  if (granularite === "jour" && type !== "depenses") {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  let response: AnalyticsResponse;

  switch (type) {
    case "depenses":
      response = await getDepensesAnalytics(user.id, { granularity: granularite, month });
      break;
    case "revenu":
      response = await getRevenuAnalytics(user.id);
      break;
    case "epargne":
      response = await getEpargneAnalytics(user.id);
      break;
    case "pret": {
      const result = await getPretAnalytics(user.id, loanId ?? null);
      if (!result) {
        return NextResponse.json({ error: "Introuvable" }, { status: 404 });
      }
      response = result;
      break;
    }
    case "charges":
      response = await getChargesAnalytics(user.id);
      break;
  }

  return NextResponse.json(response);
}
