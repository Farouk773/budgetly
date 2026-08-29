import { prisma } from "@/backend/prisma";
import {
  computeCashFlowTimingRisk,
  computeOverdraftRisk,
  daysUntilDue,
  DatedInflow,
  DatedOutflow,
  UPCOMING_DUE_WINDOW_DAYS,
} from "@/backend/alerts";
import { daysInMonth } from "@/backend/dateUtils";
import {
  currentMonthValue,
  getMonthlyBudget,
  getRunningBalance,
  monthRange,
} from "@/backend/queries/balance";

export type UpcomingDue = {
  label: string;
  amountCents: number;
  type: "fixedCharge" | "loan";
  daysUntilDue: number;
};

export async function getAlertsSnapshot(userId: string) {
  const today = new Date();
  const month = currentMonthValue();
  const monthRangeValue = monthRange(month);

  const [running, fixedCharges, loans, budget, monthIncomes, loanPaymentsByLoan] =
    await Promise.all([
      getRunningBalance(userId, month),
      prisma.fixedCharge.findMany({ where: { userId, active: true } }),
      prisma.loan.findMany({ where: { userId, active: true } }),
      getMonthlyBudget(userId, month),
      // Même filtre `OR` que celui utilisé pour composer budget.incomeCents
      // (voir RECURRING_INCOME_PLAN.md section 3.1 / getMonthlyBudget) —
      // nécessaire ici pour dater chaque revenu (payDay) plutôt que de
      // n'avoir que leur total.
      prisma.income.findMany({
        where: {
          userId,
          OR: [
            { isRecurring: false, periodMonth: monthRangeValue },
            { isRecurring: true, periodMonth: { lt: monthRangeValue.lt } },
          ],
        },
        select: { label: true, type: true, netAmountCents: true, payDay: true },
      }),
      // Part déjà payée de chaque prêt ce mois-ci, par prêt — nécessaire pour
      // dater correctement l'échéance restante de CHAQUE prêt individuellement,
      // pas seulement le total déjà utilisé par remainingLoanCommitmentCents.
      prisma.loanPayment.groupBy({
        by: ["loanId"],
        where: { userId, date: monthRangeValue },
        _sum: { amountCents: true },
      }),
    ]);

  const paidByLoanId = new Map(
    loanPaymentsByLoan.map((r) => [r.loanId, r._sum.amountCents ?? 0])
  );

  const upcomingDues: UpcomingDue[] = [
    ...fixedCharges.map((c) => ({
      label: c.label,
      amountCents: c.amountCents,
      type: "fixedCharge" as const,
      daysUntilDue: daysUntilDue(c.dayOfMonth, today),
    })),
    // Theoretical due-date reminder, based on Loan.monthlyPaymentCents +
    // Loan.dueDayOfMonth — intentionally NOT derived from
    // budget.loanPaymentsCents (which now reflects real, dated LoanPayment
    // records instead of theoretical installments, see balance.ts). A
    // reminder must warn about an upcoming due date regardless of whether
    // the payment has already been clicked this month; a future refactor
    // must not make this loop read from getMonthlyBudget by mistake.
    ...loans.map((l) => ({
      label: l.name,
      amountCents: l.monthlyPaymentCents,
      type: "loan" as const,
      daysUntilDue: daysUntilDue(l.dueDayOfMonth, today),
    })),
  ]
    .filter((d) => d.daysUntilDue <= UPCOMING_DUE_WINDOW_DAYS)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  // Theoretical monthly commitment of currently active loans — deliberately
  // NOT budget.loanPaymentsCents on its own, since that field means "loan
  // payments actually recorded this month" (real LoanPayment rows). Using
  // only that would silently under-count the risk before the user has
  // clicked "Payer": the reminder would arrive too late instead of
  // anticipating what's still due.
  const theoreticalLoanCommitmentCents = loans.reduce(
    (sum, l) => sum + l.monthlyPaymentCents,
    0
  );

  // Cash actually on hand right now: starting balance plus everything that
  // has already moved this month (income received, expenses made, loan
  // payments already clicked). Fixed charges are deliberately excluded here
  // — this app has no "mark this charge as paid" action, so they always
  // count as still-owed below rather than as money already spent. Without
  // this, the alert compared the *start-of-month* balance alone against the
  // full monthly commitment, ignoring income already received this month —
  // it could warn "you're short 852" even right after a 1900 salary was
  // logged, which is exactly backwards.
  const currentCashOnHandCents =
    running.startingBalanceCents +
    budget.incomeCents -
    budget.expensesCents -
    budget.loanPaymentsCents;

  // What's still owed: fixed charges (always, no paid/unpaid tracking) plus
  // whatever part of this month's theoretical loan commitment hasn't already
  // been paid. Netting out budget.loanPaymentsCents here too avoids counting
  // an already-recorded payment both as cash spent above AND as still due.
  const remainingLoanCommitmentCents = Math.max(
    0,
    theoreticalLoanCommitmentCents - budget.loanPaymentsCents
  );

  const overdraft = computeOverdraftRisk({
    balanceCents: currentCashOnHandCents,
    upcomingCommittedCents: budget.fixedChargesCents + remainingLoanCommitmentCents,
  });

  const outflows: DatedOutflow[] = [
    ...fixedCharges.map((c) => ({
      label: c.label,
      dayOfMonth: c.dayOfMonth,
      amountCents: c.amountCents,
    })),
    ...loans
      .map((l) => {
        const paid = paidByLoanId.get(l.id) ?? 0;
        const remaining = Math.max(0, l.monthlyPaymentCents - paid);
        return remaining > 0
          ? { label: l.name, dayOfMonth: l.dueDayOfMonth, amountCents: remaining }
          : null;
      })
      .filter((o): o is DatedOutflow => o !== null),
  ];

  const inflows: DatedInflow[] = monthIncomes.map((i) => ({
    label: i.label ?? "Revenu",
    payDay: i.payDay,
    amountCents: i.netAmountCents,
  }));

  // Ne calculer le risque de timing QUE si le mois n'est pas déjà en
  // découverte totale (voir CASHFLOW_TIMING_PLAN.md section 2.4) — sinon
  // c'est le même problème que `overdraft`, pas un problème de timing
  // distinct ; les deux alertes ne se déclenchent donc jamais ensemble.
  const cashFlowRisk = overdraft.atRisk
    ? { atRisk: false, worstDayOfMonth: null, shortfallCents: 0, recoversOnDay: null }
    : computeCashFlowTimingRisk({
        currentCashOnHandCents,
        todayDayOfMonth: today.getUTCDate(),
        daysInMonthCount: daysInMonth(month),
        outflows,
        inflows,
      });

  return { overdraft, cashFlowRisk, upcomingDues };
}
