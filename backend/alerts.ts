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

export type DatedOutflow = {
  label: string;
  dayOfMonth: number; // FixedCharge.dayOfMonth ou Loan.dueDayOfMonth, tel quel (pas encore borné au mois)
  amountCents: number;
};

export type DatedInflow = {
  label: string;
  payDay: number | null; // Income.payDay ; null = jour inconnu
  amountCents: number;
};

export type CashFlowTimingRisk = {
  atRisk: boolean;
  worstDayOfMonth: number | null; // jour du creux le plus bas, null si atRisk=false
  shortfallCents: number;         // montant du plus grand manque observé, 0 si atRisk=false
  recoversOnDay: number | null;   // premier jour après le creux où le solde simulé repasse >= 0
};

/** Simulates the day-by-day cash position from today to the end of the
 * current month, to catch a temporary dip below zero that a purely monthly
 * total (computeOverdraftRisk) can't see — e.g. rent due on the 1st while
 * the salary only lands on the 28th. See CASHFLOW_TIMING_PLAN.md section 2
 * for the full reasoning and the proof that this never duplicates
 * computeOverdraftRisk's warning: callers must only invoke this function
 * when `overdraft.atRisk` is false (see backend/queries/alerts.ts). */
export function computeCashFlowTimingRisk(params: {
  // Même valeur EXACTE que `currentCashOnHandCents` calculé dans
  // `getAlertsSnapshot` et passée à `computeOverdraftRisk({ balanceCents })` —
  // c'est-à-dire : solde de départ du mois + tout ce qui a DÉJÀ bougé ce
  // mois-ci (revenus déclarés, dépenses faites, prêts déjà payés). Important :
  // cette valeur compte déjà la TOTALITÉ des revenus déclarés ce mois, y
  // compris un revenu récurrent compté "à l'avance" dès le 1er du mois par
  // `getMonthlyBudget`, alors qu'il n'arrive réellement que le `payDay`. La
  // fonction neutralise elle-même cet effet en avance (voir plan section 2.3)
  // — l'appelant n'a rien à retraiter, il passe cette valeur telle quelle.
  currentCashOnHandCents: number;
  todayDayOfMonth: number;   // today.getUTCDate()
  daysInMonthCount: number;  // daysInMonth(month), déjà dans backend/dateUtils.ts
  outflows: DatedOutflow[];  // charges fixes actives (montant plein) + part de prêt encore due CE mois
  inflows: DatedInflow[];    // revenus comptés ce mois (ponctuels + récurrents actifs), avec leur payDay
}): CashFlowTimingRisk {
  const clamp = (day: number) =>
    Math.min(Math.max(day, 1), params.daysInMonthCount);

  const pendingInflows = params.inflows
    .map((inc) => ({
      ...inc,
      effectiveDay: clamp(inc.payDay ?? params.daysInMonthCount),
    }))
    .filter((inc) => inc.effectiveDay >= params.todayDayOfMonth);

  const pendingInflowsCents = pendingInflows.reduce(
    (sum, inc) => sum + inc.amountCents,
    0
  );

  const outflowsByDay = new Map<number, number>();
  for (const o of params.outflows) {
    const day = Math.max(clamp(o.dayOfMonth), params.todayDayOfMonth);
    outflowsByDay.set(day, (outflowsByDay.get(day) ?? 0) + o.amountCents);
  }

  const inflowsByDay = new Map<number, number>();
  for (const inc of pendingInflows) {
    inflowsByDay.set(
      inc.effectiveDay,
      (inflowsByDay.get(inc.effectiveDay) ?? 0) + inc.amountCents
    );
  }

  let running = params.currentCashOnHandCents - pendingInflowsCents;
  const dailyBalances: { day: number; balanceCents: number }[] = [];
  for (let day = params.todayDayOfMonth; day <= params.daysInMonthCount; day++) {
    running -= outflowsByDay.get(day) ?? 0; // sorties d'abord
    running += inflowsByDay.get(day) ?? 0;  // entrées ensuite
    dailyBalances.push({ day, balanceCents: running });
  }

  let worst = dailyBalances[0];
  for (const point of dailyBalances) {
    if (point.balanceCents < worst.balanceCents) worst = point;
  }

  if (worst.balanceCents >= 0) {
    return { atRisk: false, worstDayOfMonth: null, shortfallCents: 0, recoversOnDay: null };
  }

  // `recoversOnDay` is guaranteed non-null here whenever the caller only
  // invokes this function with `overdraft.atRisk === false` (see proof in
  // CASHFLOW_TIMING_PLAN.md section 2.4): the last simulated day is then
  // always >= 0, so it's always a valid fallback candidate. The type stays
  // `number | null` defensively in case that gate ever changes.
  const recovery = dailyBalances.find(
    (p) => p.day > worst.day && p.balanceCents >= 0
  );

  return {
    atRisk: true,
    worstDayOfMonth: worst.day,
    shortfallCents: -worst.balanceCents,
    recoversOnDay: recovery ? recovery.day : null,
  };
}
