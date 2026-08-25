import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toFixedChargeDto } from "@/backend/serializers/fixedCharge";
import { fixedChargeInputSchema } from "@/backend/validations/fixedCharge";

async function getOwnedFixedCharge(userId: string, id: string) {
  const fixedCharge = await prisma.fixedCharge.findUnique({ where: { id } });
  if (!fixedCharge || fixedCharge.userId !== userId) return null;
  return fixedCharge;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedFixedCharge(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = fixedChargeInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  if (parsed.data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    }
  }

  const fixedCharge = await prisma.fixedCharge.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  });

  return NextResponse.json({ fixedCharge: toFixedChargeDto(fixedCharge) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedFixedCharge(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.fixedCharge.delete({ where: { id } });
  return NextResponse.json({}, { status: 200 });
}
