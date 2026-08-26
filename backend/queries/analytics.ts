// Queries backing GET /api/analytics/[type] — one function per curve type
// (see ANALYTICS_PLAN.md for the full contract). Each function scopes every
// Prisma query on the given userId, exactly like the rest of backend/queries.
//
// IMPORTANT (household/foyer isolation): these functions must NEVER aggregate
// data across multiple users, even for accepted PartnerLink members. Only
// `/api/household/summary` (backend/queries/household.ts) is allowed to
// combine several users' data, and only after checking mutual consent via
// getAcceptedPartnerIds(). Do not reuse these functions to build a future
// "household analytics" view without reproducing that consent check.

import { prisma } from "@/backend/prisma";
import { currentMonthValue, monthRange } from "@/backend/queries/balance";
import { daysInMonth, shiftMonth, toMonthString } from "@/backend/dateUtils";
import { reconcileSavingsCumulative, reconstructLoanBalanceHistory } from "@/backend/finance";
import type {
  AnalyticsPoint,
  ChargesAnalyticsResponse,
  DepensesAnalyticsResponse,
  EpargneAnalyticsResponse,
  LoanOption,
  PretAnalyticsResponse,
  RevenuAnalyticsResponse,
} from "@/backend/types";

const CHARGES_CAVEAT =
  "Cette courbe est une estimation basée sur les charges actuellement enregistrées et leur date d'ajout — les suppressions ou changements de montant antérieurs à aujourd'hui ne sont pas garantis d'être reflétés avec exactitude.";

const PRET_CAVEAT =
  "Cette courbe est une reconstruction estimée à partir des paramètres actuels du prêt (mensualité, taux) — elle ne peut pas détecter d'éventuels remboursements anticipés passés. Seul le point du mois en cours reflète le montant réellement restant dû.";

const EPARGNE_CAVEAT =
  "Le cumul affiché a été ajusté pour refléter le total actuel de votre épargne, qui a pu être modifié manuellement (montant initial ou correction) sans laisser de trace datée.";

/** firstDataMonth(type) = MIN(mois de création du compte, mois de la donnée
 * la plus ancienne pertinente pour ce type). Kept as a single shared helper
 * so every curve type applies the exact same anchoring rule (see section 4
 * of ANALYTICS_PLAN.md). */
function firstDataMonth(accountCreatedAt: Date, earliestDataDate: Date | null): string {
  const accountMonth = toMonthString(accountCreatedAt);
  if (!earliestDataDate) return accountMonth;
  const dataMonth = toMonthString(earliestDataDate);
  return dataMonth < accountMonth ? dataMonth : accountMonth;
}

/** Inclusive list of "YYYY-MM" months from `start` to `end`. */
function monthsBetween(start: string, end: string): string[] {
  const months: string[] = [];
  for (let m = start; m <= end; m = shiftMonth(m, 1)) {
    months.push(m);
  }
  return months;
}

export async function getDepensesAnalytics(
  userId: string,
  params: { granularity: "jour" | "mois"; month?: string }
): Promise<DepensesAnalyticsResponse> {
  if (params.granularity === "jour") {
    const month = params.month ?? currentMonthValue();
    const range = monthRange(month);

    // Scoped to Expense only (one-off spending) — deliberately NOT merged
    // with FixedCharge, unlike getSpendingByCategory (backend/queries/spending.ts).
    // The brief treats "Dépenses" and "Charges fixes" as two separate curves;
    // merging them here would make the "Charges fixes" curve redundant.
    const rows = await prisma.expense.groupBy({
      by: ["date"],
      where: { userId, date: range },
      _sum: { amountCents: true },
      orderBy: { date: "asc" },
    });

    const totalsByDay = new Map<string, number>();
    for (const row of rows) {
      totalsByDay.set(row.date.toISOString().slice(0, 10), row._sum.amountCents ?? 0);
    }

    const numDays = daysInMonth(month);
    const points: AnalyticsPoint[] = [];
    for (let day = 1; day <= numDays; day++) {
      const dayKey = `${month}-${String(day).padStart(2, "0")}`;
      points.push({ date: dayKey, valueCents: totalsByDay.get(dayKey) ?? 0 });
    }

    return {
      type: "depenses",
      meta: { granularity: "jour", firstDataMonth: month, estimated: false },
      points,
    };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { createdAt: true },
  });
  const earliestExpense = await prisma.expense.aggregate({
    where: { userId },
    _min: { date: true },
  });
  const anchorMonth = firstDataMonth(user.createdAt, earliestExpense._min.date);
  const currentMonth = currentMonthValue();
  const months = monthsBetween(anchorMonth, currentMonth);

  const aggregates = await Promise.all(
    months.map((m) =>
      prisma.expense.aggregate({
        where: { userId, date: monthRange(m) },
        _sum: { amountCents: true },
      })
    )
  );

  const points: AnalyticsPoint[] = months.map((m, i) => ({
    date: m,
    valueCents: aggregates[i]._sum.amountCents ?? 0,
  }));

  return {
    type: "depenses",
    meta: { granularity: "mois", firstDataMonth: anchorMonth, estimated: false },
    points,
  };
}

export async function getRevenuAnalytics(userId: string): Promise<RevenuAnalyticsResponse> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { createdAt: true },
  });
  const earliestIncome = await prisma.income.aggregate({
    where: { userId },
    _min: { periodMonth: true },
  });
  const anchorMonth = firstDataMonth(user.createdAt, earliestIncome._min.periodMonth);
  const currentMonth = currentMonthValue();
  const months = monthsBetween(anchorMonth, currentMonth);

  const aggregates = await Promise.all(
    months.map((m) =>
      prisma.income.aggregate({
        where: { userId, periodMonth: monthRange(m) },
        _sum: { netAmountCents: true },
      })
    )
  );

  const points: AnalyticsPoint[] = months.map((m, i) => ({
    date: m,
    valueCents: aggregates[i]._sum.netAmountCents ?? 0,
  }));

  return {
    type: "revenu",
    meta: { granularity: "mois", firstDataMonth: anchorMonth, estimated: false },
    points,
  };
}

export async function getEpargneAnalytics(userId: string): Promise<EpargneAnalyticsResponse> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { createdAt: true },
  });

  const [earliestGoal, earliestContribution, totalAgg] = await Promise.all([
    prisma.savingsGoal.aggregate({ where: { userId }, _min: { createdAt: true } }),
    prisma.savingsContribution.aggregate({ where: { userId }, _min: { createdAt: true } }),
    prisma.savingsGoal.aggregate({ where: { userId }, _sum: { currentCents: true } }),
  ]);

  const candidateDates = [earliestGoal._min.createdAt, earliestContribution._min.createdAt].filter(
    (d): d is Date => d !== null
  );
  const earliestDate =
    candidateDates.length === 0
      ? null
      : candidateDates.reduce((min, d) => (d < min ? d : min));

  const anchorMonth = firstDataMonth(user.createdAt, earliestDate);
  const currentMonth = currentMonthValue();
  const months = monthsBetween(anchorMonth, currentMonth);

  const aggregates = await Promise.all(
    months.map((m) =>
      prisma.savingsContribution.aggregate({
        where: { userId, createdAt: monthRange(m) },
        _sum: { amountCents: true },
      })
    )
  );

  const monthlyFlowsCents = months.map((m, i) => ({
    month: m,
    amountCents: aggregates[i]._sum.amountCents ?? 0,
  }));
  const totalSavedCents = totalAgg._sum.currentCents ?? 0;

  const { cumulativePoints, estimated } = reconcileSavingsCumulative({
    monthlyFlowsCents,
    authoritativeTotalCents: totalSavedCents,
  });

  const points: AnalyticsPoint[] = monthlyFlowsCents.map((flow) => ({
    date: flow.month,
    valueCents: flow.amountCents,
  }));

  return {
    type: "epargne",
    meta: {
      granularity: "mois",
      firstDataMonth: anchorMonth,
      estimated,
      caveat: estimated ? EPARGNE_CAVEAT : undefined,
    },
    points,
    cumulativePoints: cumulativePoints.map((c) => ({ date: c.month, valueCents: c.valueCents })),
    totalSavedCents,
  };
}

/** Returns null when `loanId` was provided but doesn't belong to (or doesn't
 * match) any loan owned by this user — the route translates that into a
 * generic 404, never a 403, so an attacker can't tell a foreign loan exists.
 * The ownership check happens implicitly: `loans` below is always scoped to
 * `userId`, so a foreign loanId simply can't be found in it. */
export async function getPretAnalytics(
  userId: string,
  loanId: string | null
): Promise<PretAnalyticsResponse | null> {
  const loans = await prisma.loan.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      remainingCents: true,
      monthlyPaymentCents: true,
      annualRateBps: true,
      createdAt: true,
    },
  });

  const loanOptions: LoanOption[] = loans.map((l) => ({ id: l.id, name: l.name }));

  if (loans.length === 0) {
    if (loanId) return null;
    return {
      type: "pret",
      meta: {
        granularity: "mois",
        firstDataMonth: currentMonthValue(),
        estimated: true,
        caveat: PRET_CAVEAT,
      },
      loans: loanOptions,
      selectedLoanId: null,
      points: [],
    };
  }

  const selectedLoan = loanId ? loans.find((l) => l.id === loanId) : loans[0];
  if (!selectedLoan) {
    return null;
  }

  const loanCreatedMonth = toMonthString(selectedLoan.createdAt);
  const currentMonth = currentMonthValue();

  const history = reconstructLoanBalanceHistory({
    currentRemainingCents: selectedLoan.remainingCents,
    monthlyPaymentCents: selectedLoan.monthlyPaymentCents,
    annualRateBps: selectedLoan.annualRateBps,
    loanCreatedMonth,
    currentMonth,
  });

  const points: AnalyticsPoint[] = history.map((h) => ({ date: h.month, valueCents: h.remainingCents }));

  return {
    type: "pret",
    meta: { granularity: "mois", firstDataMonth: loanCreatedMonth, estimated: true, caveat: PRET_CAVEAT },
    loans: loanOptions,
    selectedLoanId: selectedLoan.id,
    points,
  };
}

export async function getChargesAnalytics(userId: string): Promise<ChargesAnalyticsResponse> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { createdAt: true },
  });
  const earliestCharge = await prisma.fixedCharge.aggregate({
    where: { userId },
    _min: { createdAt: true },
  });
  const anchorMonth = firstDataMonth(user.createdAt, earliestCharge._min.createdAt);
  const currentMonth = currentMonthValue();
  const months = monthsBetween(anchorMonth, currentMonth);

  const aggregates = await Promise.all(
    months.map((m) => {
      const range = monthRange(m);
      return prisma.fixedCharge.aggregate({
        where: {
          userId,
          createdAt: { lt: range.lt }, // existait déjà à la fin du mois m
          OR: [
            { active: true }, // toujours active aujourd'hui
            { updatedAt: { gte: range.lt } }, // désactivée seulement après la fin du mois m
          ],
        },
        _sum: { amountCents: true },
      });
    })
  );

  const points: AnalyticsPoint[] = months.map((m, i) => ({
    date: m,
    valueCents: aggregates[i]._sum.amountCents ?? 0,
  }));

  return {
    type: "charges",
    meta: { granularity: "mois", firstDataMonth: anchorMonth, estimated: true, caveat: CHARGES_CAVEAT },
    points,
  };
}
