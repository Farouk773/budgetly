import { prisma } from "@/backend/prisma";
import {
  computeOverdraftRisk,
  daysUntilDue,
  UPCOMING_DUE_WINDOW_DAYS,
} from "@/backend/alerts";
import { getMonthlyBudget, getRunningBalance, currentMonthValue } from "@/backend/queries/balance";

export type UpcomingDue = {
  label: string;
  amountCents: number;
  type: "fixedCharge" | "loan";
  daysUntilDue: number;
};

export async function getAlertsSnapshot(userId: string) {
  const today = new Date();
  const month = currentMonthValue();

  const [running, fixedCharges, loans, budget] = await Promise.all([
    getRunningBalance(userId, month),
    prisma.fixedCharge.findMany({ where: { userId, active: true } }),
    prisma.loan.findMany({ where: { userId, active: true } }),
    getMonthlyBudget(userId, month),
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

  const overdraft = computeOverdraftRisk({
    balanceCents: running.startingBalanceCents,
    upcomingCommittedCents: budget.fixedChargesCents + budget.loanPaymentsCents,
  });

  return { overdraft, upcomingDues };
}
