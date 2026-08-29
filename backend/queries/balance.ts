import { prisma } from "@/backend/prisma";
import {
  computeMonthlyAvailableCents,
  projectEndOfMonthCents,
  suggestSavingsCents,
} from "@/backend/finance";
import { shiftMonth, toMonthString } from "@/backend/dateUtils";

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

  const [nonRecurringIncomeAgg, recurringIncomeAgg, expenseAgg, activeFixedCharges, loanPaymentAgg] =
    await Promise.all([
      // One-off incomes: only the exact month they were declared for.
      prisma.income.aggregate({
        where: { userId, isRecurring: false, periodMonth: range },
        _sum: { netAmountCents: true },
      }),
      // Recurring incomes: counted every month from their start month
      // (periodMonth) onward — `periodMonth < range.lt` covers "started this
      // month or any earlier month", exactly the FixedCharge.active model but
      // anchored to a start date instead of being unconditionally always-on.
      prisma.income.aggregate({
        where: { userId, isRecurring: true, periodMonth: { lt: range.lt } },
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
      // Real, dated payments recorded via the "Payer" button — NOT the
      // theoretical monthly installment of active loans. Deliberately not
      // filtered on Loan.active: a payment made this month must still count
      // even if it just brought the loan's remaining balance to zero (the
      // loan was active at the moment of the click, inactive right after).
      prisma.loanPayment.aggregate({
        where: { userId, date: range },
        _sum: { amountCents: true },
      }),
    ]);

  const incomeCents =
    (nonRecurringIncomeAgg._sum.netAmountCents ?? 0) +
    (recurringIncomeAgg._sum.netAmountCents ?? 0);
  const expensesCents = expenseAgg._sum.amountCents ?? 0;
  const fixedChargesCents = activeFixedCharges._sum.amountCents ?? 0;
  const loanPaymentsCents = loanPaymentAgg._sum.amountCents ?? 0;

  const availableCents = computeMonthlyAvailableCents({
    incomeCents,
    fixedChargesCents,
    loanPaymentsCents,
    expensesCents,
  });

  return {
    month,
    incomeCents,
    fixedChargesCents,
    loanPaymentsCents,
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

/**
 * The running total for a given month: the last declared/corrected balance
 * (the "anchor"), carried forward month by month by adding each completed
 * month's available-cents delta — so a surplus or a deficit both roll into
 * the next month automatically, the way a real account balance does.
 *
 * With no declared balance at all, the anchor is 0 cents at the user's
 * signup month, so the running total is derived purely from what's been
 * logged in the app (no bank account required).
 */
export async function getRunningBalance(userId: string, targetMonth: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { balanceCents: true, balanceAsOf: true, balanceSource: true, createdAt: true },
  });

  const isDeclared = user.balanceCents !== null;
  const declaredAsOf = user.balanceAsOf ? user.balanceAsOf.toISOString() : null;
  const balanceSource = user.balanceSource;
  const anchorMonth = toMonthString(user.balanceAsOf ?? user.createdAt);
  const anchorCents = user.balanceCents ?? 0;

  if (targetMonth <= anchorMonth) {
    return {
      startingBalanceCents: anchorCents,
      anchorMonth,
      isDeclared,
      declaredAsOf,
      balanceSource,
    };
  }

  const months: string[] = [];
  for (let m = anchorMonth; m < targetMonth; m = shiftMonth(m, 1)) {
    months.push(m);
  }

  const budgets = await Promise.all(months.map((m) => getMonthlyBudget(userId, m)));
  const startingBalanceCents = budgets.reduce(
    (total, b) =>
      projectEndOfMonthCents({ balanceCents: total, monthlyAvailableCents: b.availableCents }),
    anchorCents
  );

  return { startingBalanceCents, anchorMonth, isDeclared, declaredAsOf, balanceSource };
}
