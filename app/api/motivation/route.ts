import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMotivationSnapshot } from "@/lib/queries/motivation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const snapshot = await getMotivationSnapshot(user.id);
  return NextResponse.json(snapshot);
}
