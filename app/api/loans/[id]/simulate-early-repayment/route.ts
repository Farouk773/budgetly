import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { simulateEarlyRepayment } from "@/backend/finance";
import { prisma } from "@/backend/prisma";
import { earlyRepaymentSimulationSchema } from "@/backend/validations/loan";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan || loan.userId !== user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = earlyRepaymentSimulationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Entrée invalide" }, { status: 400 });
  }

  const result = simulateEarlyRepayment({
    remainingCents: loan.remainingCents,
    monthlyPaymentCents: loan.monthlyPaymentCents,
    annualRateBps: loan.annualRateBps,
    extraPaymentCents: parsed.data.extraPaymentCents,
  });

  return NextResponse.json(result);
}
