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

export type BalanceSource = "BANK" | "CASH" | "MIXED";

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
  overdraft: { atRisk: boolean; shortfallCents: number };
  upcomingDues: UpcomingDue[];
};

export type PartnerLinkStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type PartnerLink = {
  id: string;
  status: PartnerLinkStatus;
  direction: "sent" | "received";
  otherUser: { id: string; email: string; name: string | null };
  createdAt: string;
};

export type HouseholdMemberBudget = {
  userId: string;
  name: string | null;
  email: string;
  incomeCents: number;
  fixedChargesCents: number;
  loanPaymentsCents: number;
  expensesCents: number;
  availableCents: number;
};

export type HouseholdSummary = {
  month: string;
  members: HouseholdMemberBudget[];
  combined: {
    incomeCents: number;
    fixedChargesCents: number;
    loanPaymentsCents: number;
    expensesCents: number;
    availableCents: number;
  };
};

export type AnalyticsType = "depenses" | "revenu" | "epargne" | "pret" | "charges";
export type AnalyticsGranularity = "jour" | "mois";

export type AnalyticsPoint = {
  /** "YYYY-MM-DD" en granularité jour, "YYYY-MM" en granularité mois. */
  date: string;
  valueCents: number;
};

export type AnalyticsMeta = {
  granularity: AnalyticsGranularity;
  /** Mois d'ancrage utilisé comme premier point de la série (voir règle en section 4). */
  firstDataMonth: string;
  /** true si la série est une reconstruction best-effort et non un historique
   * réellement enregistré (voir section 5) — le front DOIT afficher `caveat`
   * de façon visible (bandeau/tooltip) quand cette valeur est true. */
  estimated: boolean;
  /** Texte explicatif en français, présent seulement quand estimated=true. */
  caveat?: string;
};

export type DepensesAnalyticsResponse = {
  type: "depenses";
  meta: AnalyticsMeta;
  points: AnalyticsPoint[];
};

export type RevenuAnalyticsResponse = {
  type: "revenu";
  meta: AnalyticsMeta;
  points: AnalyticsPoint[];
};

export type EpargneAnalyticsResponse = {
  type: "epargne";
  meta: AnalyticsMeta;
  /** Flux mensuel : montant versé ce mois-là. */
  points: AnalyticsPoint[];
  /** Cumul à date, même axe X que points (voir reconciliation en section 5). */
  cumulativePoints: AnalyticsPoint[];
  /** Cumul total actuel, toujours égal à la somme des SavingsGoal.currentCents
   * de l'utilisateur (source de vérité utilisée partout ailleurs dans l'app) —
   * et donc toujours égal au dernier point de cumulativePoints. */
  totalSavedCents: number;
};

export type LoanOption = { id: string; name: string };

export type PretAnalyticsResponse = {
  type: "pret";
  meta: AnalyticsMeta; // estimated toujours true pour ce type
  loans: LoanOption[];
  selectedLoanId: string | null; // null seulement si l'utilisateur n'a aucun prêt
  points: AnalyticsPoint[]; // remainingCents par mois pour selectedLoanId
};

export type ChargesAnalyticsResponse = {
  type: "charges";
  meta: AnalyticsMeta; // estimated toujours true pour ce type
  points: AnalyticsPoint[];
};

export type AnalyticsResponse =
  | DepensesAnalyticsResponse
  | RevenuAnalyticsResponse
  | EpargneAnalyticsResponse
  | PretAnalyticsResponse
  | ChargesAnalyticsResponse;
