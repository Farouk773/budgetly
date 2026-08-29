import { NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { getCategoriesForDropdown } from "@/backend/queries/categories";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const categories = await getCategoriesForDropdown();
  return NextResponse.json({ categories });
}
