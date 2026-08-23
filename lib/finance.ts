export function computeMonthlyAvailableCents(params: {
  incomeCents: number;
  fixedChargesCents: number;
  expensesCents: number;
}): number {
  return params.incomeCents - params.fixedChargesCents - params.expensesCents;
}

export function simulatePurchase(params: {
  currentBalanceCents: number;
  amountCents: number;
}): { affordable: boolean; balanceAfterCents: number } {
  const balanceAfterCents = params.currentBalanceCents - params.amountCents;
  return { affordable: balanceAfterCents >= 0, balanceAfterCents };
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
