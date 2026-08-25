import { NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { getAlertsSnapshot } from "@/backend/queries/alerts";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const snapshot = await getAlertsSnapshot(user.id);
  return NextResponse.json(snapshot);
}
