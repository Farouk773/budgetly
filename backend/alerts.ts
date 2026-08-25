export const UPCOMING_DUE_WINDOW_DAYS = 7;

/** Days from `today` until the next occurrence of `dayOfMonth` (0 = due
 * today, negative never happens — it always looks forward). */
export function daysUntilDue(dayOfMonth: number, today: Date): number {
  const startOfToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  let due = new Date(
    Date.UTC(startOfToday.getUTCFullYear(), startOfToday.getUTCMonth(), dayOfMonth)
  );
  if (due < startOfToday) {
    due = new Date(
      Date.UTC(startOfToday.getUTCFullYear(), startOfToday.getUTCMonth() + 1, dayOfMonth)
    );
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((due.getTime() - startOfToday.getTime()) / msPerDay);
}

/** Warns when the user's declared balance wouldn't cover this month's
 * remaining committed outflows (active fixed charges + loan payments). */
export function computeOverdraftRisk(params: {
  balanceCents: number;
  upcomingCommittedCents: number;
}): { atRisk: boolean; shortfallCents: number } {
  const shortfallCents = params.upcomingCommittedCents - params.balanceCents;
  return {
    atRisk: shortfallCents > 0,
    shortfallCents: Math.max(0, shortfallCents),
  };
}
