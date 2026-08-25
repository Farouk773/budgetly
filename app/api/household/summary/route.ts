import { NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { getHouseholdSummary } from "@/backend/queries/household";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const summary = await getHouseholdSummary(user.id);
  return NextResponse.json(summary);
}
