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

  // Deliberately NOT budget.loanPaymentsCents here: since that field now
  // means "loan payments actually recorded this month" (real LoanPayment
  // rows) rather than "theoretical monthly installments of active loans",
  // using it would silently under-count the overdraft risk before the user
  // has clicked "Payer" — the reminder would always arrive too late (after
  // the fact) instead of anticipating what's still due. The overdraft check
  // must anticipate every installment still owed this month, so it uses the
  // theoretical commitment of currently active loans instead.
  // fixedChargesCents is unaffected: it always reflects the sum of active
  // charges regardless of any dated record, so its semantics didn't change.
  const theoreticalLoanCommitmentCents = loans.reduce(
    (sum, l) => sum + l.monthlyPaymentCents,
    0
  );

  const overdraft = computeOverdraftRisk({
    balanceCents: running.startingBalanceCents,
    upcomingCommittedCents: budget.fixedChargesCents + theoreticalLoanCommitmentCents,
  });

  return { overdraft, upcomingDues };
}
