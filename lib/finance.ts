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
