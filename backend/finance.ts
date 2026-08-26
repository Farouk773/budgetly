import { shiftMonth } from "./dateUtils";

export function computeMonthlyAvailableCents(params: {
  incomeCents: number;
  fixedChargesCents: number;
  loanPaymentsCents: number;
  expensesCents: number;
}): number {
  return (
    params.incomeCents -
    params.fixedChargesCents -
    params.loanPaymentsCents -
    params.expensesCents
  );
}

/** Projected end-of-month total: today's declared bank balance plus what's
 * left to earn/spend this month, assuming the rest of the month follows the
 * current trend. Kept separate from the balance itself so the UI never
 * conflates "what's in the bank today" with "what the month's flow adds up
 * to" — two numbers users must be able to tell apart. */
export function projectEndOfMonthCents(params: {
  balanceCents: number;
  monthlyAvailableCents: number;
}): number {
  return params.balanceCents + params.monthlyAvailableCents;
}

export function simulatePurchase(params: {
  currentBalanceCents: number;
  amountCents: number;
}): { affordable: boolean; balanceAfterCents: number } {
  const balanceAfterCents = params.currentBalanceCents - params.amountCents;
  return { affordable: balanceAfterCents >= 0, balanceAfterCents };
}

/** Sums several people's monthly budgets into one household view (point 12
 * of the spec: shared couple/family budget). */
export function combineMonthlyBudgets(
  budgets: {
    incomeCents: number;
    fixedChargesCents: number;
    loanPaymentsCents: number;
    expensesCents: number;
  }[]
): {
  incomeCents: number;
  fixedChargesCents: number;
  loanPaymentsCents: number;
  expensesCents: number;
  availableCents: number;
} {
  const totals = budgets.reduce(
    (acc, b) => ({
      incomeCents: acc.incomeCents + b.incomeCents,
      fixedChargesCents: acc.fixedChargesCents + b.fixedChargesCents,
      loanPaymentsCents: acc.loanPaymentsCents + b.loanPaymentsCents,
      expensesCents: acc.expensesCents + b.expensesCents,
    }),
    { incomeCents: 0, fixedChargesCents: 0, loanPaymentsCents: 0, expensesCents: 0 }
  );

  return { ...totals, availableCents: computeMonthlyAvailableCents(totals) };
}

/** Suggests saving a fraction of what's left this month; never suggests
 * saving from a deficit. */
export function suggestSavingsCents(
  availableCents: number,
  ratio = 0.2
): number {
  if (availableCents <= 0) return 0;
  return Math.round(availableCents * ratio);
}

/** Number of months left on a standard amortized loan (equal payments).
 * Falls back to simple division when the rate is zero. Returns Infinity
 * if the payment doesn't even cover the monthly interest. */
export function computeRemainingMonths(params: {
  remainingCents: number;
  monthlyPaymentCents: number;
  annualRateBps: number;
}): number {
  const { remainingCents, monthlyPaymentCents, annualRateBps } = params;
  if (remainingCents <= 0) return 0;

  const monthlyRate = annualRateBps / 10_000 / 12;
  if (monthlyRate === 0) {
    return Math.ceil(remainingCents / monthlyPaymentCents);
  }

  const ratio = 1 - (monthlyRate * remainingCents) / monthlyPaymentCents;
  if (ratio <= 0) return Infinity;

  return Math.ceil(-Math.log(ratio) / Math.log(1 + monthlyRate));
}

/** Simulates paying an extra lump sum today against an amortized loan:
 * how many months earlier it finishes and how much interest that saves,
 * assuming the same monthly payment continues afterward. */
export function simulateEarlyRepayment(params: {
  remainingCents: number;
  monthlyPaymentCents: number;
  annualRateBps: number;
  extraPaymentCents: number;
}): {
  monthsBefore: number;
  monthsAfter: number;
  monthsSaved: number;
  interestSavedCents: number;
} {
  const { remainingCents, monthlyPaymentCents, annualRateBps, extraPaymentCents } =
    params;

  const monthsBefore = computeRemainingMonths({
    remainingCents,
    monthlyPaymentCents,
    annualRateBps,
  });
  const remainingAfterExtra = Math.max(0, remainingCents - extraPaymentCents);
  const monthsAfter = computeRemainingMonths({
    remainingCents: remainingAfterExtra,
    monthlyPaymentCents,
    annualRateBps,
  });

  const totalPaidBefore = monthlyPaymentCents * monthsBefore;
  const totalPaidAfter = monthlyPaymentCents * monthsAfter + extraPaymentCents;
  const interestSavedCents = Math.max(0, totalPaidBefore - totalPaidAfter);

  return {
    monthsBefore,
    monthsAfter,
    monthsSaved: monthsBefore - monthsAfter,
    interestSavedCents: Math.round(interestSavedCents),
  };
}

/** Reconstructs a month-by-month estimate of a loan's remaining principal,
 * anchored on the true current value of remainingCents and walking backward
 * in time by inverting the amortization formula, assuming monthlyPaymentCents
 * and annualRateBps have been constant since the loan was created. This is a
 * reconstruction, not a recorded history: it cannot detect a past early
 * repayment nor a past change to the payment/rate. The last point (current
 * month) is the only exact (non-estimated) value in the series. */
export function reconstructLoanBalanceHistory(params: {
  currentRemainingCents: number;
  monthlyPaymentCents: number;
  annualRateBps: number;
  loanCreatedMonth: string; // "YYYY-MM"
  currentMonth: string; // "YYYY-MM"
}): { month: string; remainingCents: number }[] {
  const { currentRemainingCents, monthlyPaymentCents, annualRateBps, currentMonth } = params;
  const monthlyRate = annualRateBps / 10_000 / 12;

  // Guard against a loan somehow "created" after the current month (should
  // not happen in practice): fall back to a single, exact point.
  const startMonth =
    params.loanCreatedMonth <= currentMonth ? params.loanCreatedMonth : currentMonth;

  const months: string[] = [];
  for (let m = startMonth; m <= currentMonth; m = shiftMonth(m, 1)) {
    months.push(m);
  }

  const remainingByIndex = new Array<number>(months.length);
  remainingByIndex[months.length - 1] = Math.max(0, currentRemainingCents);

  for (let i = months.length - 1; i > 0; i--) {
    const balance = remainingByIndex[i];
    const prevBalance =
      monthlyRate === 0
        ? balance + monthlyPaymentCents
        : Math.round((balance + monthlyPaymentCents) / (1 + monthlyRate));
    remainingByIndex[i - 1] = Math.max(0, prevBalance);
  }

  return months.map((month, i) => ({ month, remainingCents: remainingByIndex[i] }));
}

/** Sums already-DB-aggregated monthly flows (no re-summing of raw rows) into
 * a running cumulative total, then reconciles the last point with the total
 * actually shown elsewhere in the app (SavingsGoal.currentCents): any gap
 * (an untimestamped manual adjustment, or a currentCents set when a goal was
 * created) is imputed to the first month of the series rather than spread
 * arbitrarily across several months. */
export function reconcileSavingsCumulative(params: {
  monthlyFlowsCents: { month: string; amountCents: number }[]; // triés chronologiquement
  authoritativeTotalCents: number;
}): { cumulativePoints: { month: string; valueCents: number }[]; estimated: boolean } {
  const { monthlyFlowsCents, authoritativeTotalCents } = params;

  if (monthlyFlowsCents.length === 0) {
    return { cumulativePoints: [], estimated: false };
  }

  const rawTotalCents = monthlyFlowsCents.reduce((sum, flow) => sum + flow.amountCents, 0);
  const discrepancyCents = authoritativeTotalCents - rawTotalCents;

  const cumulativePoints: { month: string; valueCents: number }[] = [];
  let runningCents = 0;
  monthlyFlowsCents.forEach((flow, index) => {
    const adjustmentCents = index === 0 ? discrepancyCents : 0;
    runningCents += flow.amountCents + adjustmentCents;
    cumulativePoints.push({ month: flow.month, valueCents: runningCents });
  });

  return { cumulativePoints, estimated: discrepancyCents !== 0 };
}
