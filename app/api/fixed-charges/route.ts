import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toFixedChargeDto } from "@/lib/serializers/fixedCharge";
import { fixedChargeInputSchema } from "@/lib/validations/fixedCharge";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const fixedCharges = await prisma.fixedCharge.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: { dayOfMonth: "asc" },
  });

  return NextResponse.json({ fixedCharges: fixedCharges.map(toFixedChargeDto) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = fixedChargeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const fixedCharge = await prisma.fixedCharge.create({
    data: {
      userId: user.id,
      categoryId: parsed.data.categoryId,
      label: parsed.data.label,
      amountCents: parsed.data.amountCents,
      dayOfMonth: parsed.data.dayOfMonth,
      active: parsed.data.active,
    },
    include: { category: true },
  });

  return NextResponse.json(
    { fixedCharge: toFixedChargeDto(fixedCharge) },
    { status: 201 }
  );
}
