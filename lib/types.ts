export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type SignupInput = {
  email: string;
  password: string;
  name?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ApiError = {
  error: string;
};

export type IncomeType = "SALARY" | "FREELANCE" | "OTHER";

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  SALARY: "Salaire",
  FREELANCE: "Freelance",
  OTHER: "Autre",
};

export type Income = {
  id: string;
  type: IncomeType;
  label: string | null;
  netAmountCents: number;
  grossAmountCents: number | null;
  contributionsCents: number | null;
  bonusCents: number | null;
  overtimeCents: number | null;
  periodMonth: string;
  payslipOriginalName: string | null;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  isEssential: boolean;
};

export type FixedCharge = {
  id: string;
  categoryId: string;
  category: Category;
  label: string;
  amountCents: number;
  dayOfMonth: number;
  active: boolean;
  createdAt: string;
};

export type Expense = {
  id: string;
  categoryId: string;
  category: Category;
  label: string | null;
  amountCents: number;
  date: string;
  createdAt: string;
};

export type MonthlyBudget = {
  month: string;
  incomeCents: number;
  fixedChargesCents: number;
  loanPaymentsCents: number;
  expensesCents: number;
  availableCents: number;
  suggestedSavingsCents: number;
  balanceCents: number | null;
  balanceAsOf: string | null;
};

export type SavingsGoal = {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  targetDate: string | null;
  createdAt: string;
};

export type PurchaseSimulation = {
  affordable: boolean;
  balanceAfterCents: number;
  currentBalanceCents: number;
};

export type Loan = {
  id: string;
  name: string;
  remainingCents: number;
  monthlyPaymentCents: number;
  annualRateBps: number;
  dueDayOfMonth: number;
  endDate: string;
  active: boolean;
  createdAt: string;
};

export type EarlyRepaymentSimulation = {
  monthsBefore: number;
  monthsAfter: number;
  monthsSaved: number;
  interestSavedCents: number;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
};

export type MotivationSnapshot = {
  message: string;
  badges: Badge[];
};

export type UpcomingDue = {
  label: string;
  amountCents: number;
  type: "fixedCharge" | "loan";
  daysUntilDue: number;
};

export type AlertsSnapshot = {
  overdraft: { atRisk: boolean; shortfallCents: number } | null;
  upcomingDues: UpcomingDue[];
};
