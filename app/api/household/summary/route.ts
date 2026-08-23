import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getHouseholdSummary } from "@/lib/queries/household";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const summary = await getHouseholdSummary(user.id);
  return NextResponse.json(summary);
}
