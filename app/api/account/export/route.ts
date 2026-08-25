import { NextResponse } from "next/server";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";

// RGPD data-portability export: every record the user owns, in one file.
// Deliberately excludes passwordHash and raw session tokens.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const [
    profile,
    incomes,
    expenses,
    fixedCharges,
    loans,
    savingsGoals,
    partnerLinks,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        balanceCents: true,
        balanceAsOf: true,
        createdAt: true,
      },
    }),
    prisma.income.findMany({ where: { userId: user.id } }),
    prisma.expense.findMany({
      where: { userId: user.id },
      include: { category: true },
    }),
    prisma.fixedCharge.findMany({
      where: { userId: user.id },
      include: { category: true },
    }),
    prisma.loan.findMany({ where: { userId: user.id } }),
    prisma.savingsGoal.findMany({
      where: { userId: user.id },
      include: { contributions: true },
    }),
    prisma.partnerLink.findMany({
      where: { OR: [{ requesterId: user.id }, { partnerId: user.id }] },
      include: { requester: true, partner: true },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile,
    incomes,
    expenses,
    fixedCharges,
    loans,
    savingsGoals,
    partnerLinks: partnerLinks.map((link) => ({
      id: link.id,
      status: link.status,
      createdAt: link.createdAt,
      requesterEmail: link.requester.email,
      partnerEmail: link.partner.email,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mes-donnees-${user.id}.json"`,
    },
  });
}
