import { NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { toPartnerLinkDto } from "@/backend/serializers/household";
import { getPartnerLinks } from "@/backend/queries/household";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const links = await getPartnerLinks(user.id);
  return NextResponse.json({
    links: links.map((link) => toPartnerLinkDto(link, user.id)),
  });
}
