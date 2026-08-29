import { prisma } from "@/backend/prisma";
import {
  computeOverdraftRisk,
  daysUntilDue,
  UPCOMING_DUE_WINDOW_DAYS,
} from "@/backend/alerts";
import { getMonthlyBudget, getRunningBalance, currentMonthValue } from "@/backend/queries/balance";

export type UpcomingDue = {
  label: string;
  amountCents: number;
  type: "fixedCharge" | "loan";
  daysUntilDue: number;
};

export async function getAlertsSnapshot(userId: string) {
  const today = new Date();
  const month = currentMonthValue();

  const [running, fixedCharges, loans, budget] = await Promise.all([
    getRunningBalance(userId, month),
    prisma.fixedCharge.findMany({ where: { userId, active: true } }),
    prisma.loan.findMany({ where: { userId, active: true } }),
    getMonthlyBudget(userId, month),
  ]);

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

  return { overdraft, upcomingDues };
}
