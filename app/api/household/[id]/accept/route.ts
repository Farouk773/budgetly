import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPartnerLinkDto } from "@/lib/serializers/household";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.partnerLink.findUnique({ where: { id } });
  // only the invited party may accept
  if (!existing || existing.partnerId !== user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { error: "Cette invitation n'est plus en attente" },
      { status: 409 }
    );
  }

  const link = await prisma.partnerLink.update({
    where: { id },
    data: { status: "ACCEPTED" },
    include: { requester: true, partner: true },
  });

  return NextResponse.json({ link: toPartnerLinkDto(link, user.id) });
}
