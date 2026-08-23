import { prisma } from "@/lib/prisma";
import { getMonthlyBudget, monthRange } from "@/lib/queries/balance";

export async function getMonthlyReportData(userId: string, month: string) {
  const range = monthRange(month);

  const [budget, incomes, expenses, fixedCharges, loans] = await Promise.all([
    getMonthlyBudget(userId, month),
    prisma.income.findMany({
      where: { userId, periodMonth: range },
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
