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
