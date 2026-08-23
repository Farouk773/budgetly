import { prisma } from "@/lib/prisma";
import {
  computeOverdraftRisk,
  daysUntilDue,
  UPCOMING_DUE_WINDOW_DAYS,
} from "@/lib/alerts";
import { getMonthlyBudget, currentMonthValue } from "@/lib/queries/balance";

export type UpcomingDue = {
  label: string;
  amountCents: number;
  type: "fixedCharge" | "loan";
  daysUntilDue: number;
};

export async function getAlertsSnapshot(userId: string) {
  const today = new Date();

  const [user, fixedCharges, loans, budget] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balanceCents: true },
    }),
    prisma.fixedCharge.findMany({ where: { userId, active: true } }),
    prisma.loan.findMany({ where: { userId, active: true } }),
    getMonthlyBudget(userId, currentMonthValue()),
  ]);

  const upcomingDues: UpcomingDue[] = [
    ...fixedCharges.map((c) => ({
      label: c.label,
      amountCents: c.amountCents,
      type: "fixedCharge" as const,
      daysUntilDue: daysUntilDue(c.dayOfMonth, today),
    })),
    ...loans.map((l) => ({
      label: l.name,
      amountCents: l.monthlyPaymentCents,
      type: "loan" as const,
      daysUntilDue: daysUntilDue(l.dueDayOfMonth, today),
    })),
  ]
    .filter((d) => d.daysUntilDue <= UPCOMING_DUE_WINDOW_DAYS)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const overdraft =
    user.balanceCents === null
      ? null
      : computeOverdraftRisk({
          balanceCents: user.balanceCents,
          upcomingCommittedCents: budget.fixedChargesCents + budget.loanPaymentsCents,
        });

  return { overdraft, upcomingDues };
}
