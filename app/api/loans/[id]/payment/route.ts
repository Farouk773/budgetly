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

  // Single transaction so the remaining principal and the dated payment
  // record are never out of sync (if either write failed on its own, we
  // could end up with remainingCents decreased without a matching
  // LoanPayment, or vice versa) — same reasoning already applied to
  // SavingsGoal.currentCents + SavingsContribution.
  const [loan] = await prisma.$transaction([
    prisma.loan.update({
      where: { id },
      data: {
        remainingCents: newRemainingCents,
        active: newRemainingCents > 0,
      },
    }),
    prisma.loanPayment.create({
      data: {
        loanId: id,
        // Always the current session's user, never a value derived from the
        // request body — the body only carries amountCents, so there is no
        // way for a caller to create a payment on another user's behalf (IDOR).
        userId: user.id,
        amountCents: parsed.data.amountCents,
        date: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ loan: toLoanDto(loan) });
}
