import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.partnerLink.findUnique({ where: { id } });
  if (
    !existing ||
    (existing.requesterId !== user.id && existing.partnerId !== user.id)
  ) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.partnerLink.delete({ where: { id } });
  return NextResponse.json({}, { status: 200 });
}
