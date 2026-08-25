import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toLoanDto } from "@/backend/serializers/loan";
import { loanPaymentSchema } from "@/backend/validations/loan";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.loan.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = loanPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const newRemainingCents = Math.max(
    0,
    existing.remainingCents - parsed.data.amountCents
  );

  const loan = await prisma.loan.update({
    where: { id },
    data: {
      remainingCents: newRemainingCents,
      active: newRemainingCents > 0,
    },
  });

  return NextResponse.json({ loan: toLoanDto(loan) });
}
