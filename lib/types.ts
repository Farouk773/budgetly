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
