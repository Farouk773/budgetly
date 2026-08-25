import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toLoanDto } from "@/backend/serializers/loan";
import { updateLoanSchema } from "@/backend/validations/loan";

async function getOwnedLoan(userId: string, id: string) {
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan || loan.userId !== userId) return null;
  return loan;
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
  const existing = await getOwnedLoan(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const loan = await prisma.loan.update({
    where: { id },
    data: {
      name: parsed.data.name,
      remainingCents: parsed.data.remainingCents,
      monthlyPaymentCents: parsed.data.monthlyPaymentCents,
      annualRateBps: parsed.data.annualRateBps,
      dueDayOfMonth: parsed.data.dueDayOfMonth,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      active: parsed.data.active,
    },
  });

  return NextResponse.json({ loan: toLoanDto(loan) });
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
  const existing = await getOwnedLoan(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.loan.delete({ where: { id } });
  return NextResponse.json({}, { status: 200 });
}
