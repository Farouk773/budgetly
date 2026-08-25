import { NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { getMotivationSnapshot } from "@/backend/queries/motivation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const snapshot = await getMotivationSnapshot(user.id);
  return NextResponse.json(snapshot);
}
