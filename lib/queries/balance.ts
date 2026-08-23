import { prisma } from "@/lib/prisma";
import { computeMonthlyAvailableCents, suggestSavingsCents } from "@/lib/finance";

export function monthRange(month: string): { gte: Date; lt: Date } {
  const gte = new Date(`${month}-01T00:00:00.000Z`);
  const lt = new Date(gte);
  lt.setUTCMonth(lt.getUTCMonth() + 1);
  return { gte, lt };
}

export function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getMonthlyBudget(userId: string, month: string) {
  const range = monthRange(month);

  const [incomeAgg, expenseAgg, activeFixedCharges] = await Promise.all([
    prisma.income.aggregate({
      where: { userId, periodMonth: range },
      _sum: { netAmountCents: true },
    }),
    prisma.expense.aggregate({
      where: { userId, date: range },
      _sum: { amountCents: true },
    }),
    prisma.fixedCharge.aggregate({
      where: { userId, active: true },
      _sum: { amountCents: true },
    }),
  ]);

  const incomeCents = incomeAgg._sum.netAmountCents ?? 0;
  const expensesCents = expenseAgg._sum.amountCents ?? 0;
  const fixedChargesCents = activeFixedCharges._sum.amountCents ?? 0;

  const availableCents = computeMonthlyAvailableCents({
    incomeCents,
    fixedChargesCents,
    expensesCents,
  });

  return {
    month,
    incomeCents,
    fixedChargesCents,
    expensesCents,
    availableCents,
    suggestedSavingsCents: suggestSavingsCents(availableCents),
  };
}

export async function getDeclaredBalance(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { balanceCents: true, balanceAsOf: true },
  });
  return {
    balanceCents: user.balanceCents,
    balanceAsOf: user.balanceAsOf ? user.balanceAsOf.toISOString() : null,
  };
}
