import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAlertsSnapshot } from "@/lib/queries/alerts";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const snapshot = await getAlertsSnapshot(user.id);
  return NextResponse.json(snapshot);
}
