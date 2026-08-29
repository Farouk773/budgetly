import { prisma } from "@/backend/prisma";
import { getMonthlyBudget, monthRange } from "@/backend/queries/balance";

export async function getMonthlyReportData(userId: string, month: string) {
  const range = monthRange(month);

  const [budget, incomes, expenses, fixedCharges, loans] = await Promise.all([
    getMonthlyBudget(userId, month),
    // Lists one-off incomes for this month AND recurring incomes still
    // active at this date — same rule as getMonthlyBudget/getRevenuAnalytics
    // (see RECURRING_INCOME_PLAN.md section 3.1), so the "Résumé" total
    // (budget.incomeCents) always matches the detailed "Revenus" lines below.
    prisma.income.findMany({
      where: {
        userId,
        OR: [
          { isRecurring: false, periodMonth: range },
          { isRecurring: true, periodMonth: { lt: range.lt } },
        ],
      },
      orderBy: { periodMonth: "asc" },
    }),
    prisma.expense.findMany({
      where: { userId, date: range },
      include: { category: true },
      orderBy: { date: "asc" },
    }),
    prisma.fixedCharge.findMany({
      where: { userId, active: true },
      include: { category: true },
      orderBy: { dayOfMonth: "asc" },
    }),
    prisma.loan.findMany({
      where: { userId, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { month, budget, incomes, expenses, fixedCharges, loans };
}

export type MonthlyReportData = Awaited<ReturnType<typeof getMonthlyReportData>>;
