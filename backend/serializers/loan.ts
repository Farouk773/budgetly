import type { Loan as PrismaLoan } from "@/backend/generated/prisma/client";
import type { Loan } from "@/backend/types";

export function toLoanDto(loan: PrismaLoan): Loan {
  return {
    id: loan.id,
    name: loan.name,
    remainingCents: loan.remainingCents,
    monthlyPaymentCents: loan.monthlyPaymentCents,
    annualRateBps: loan.annualRateBps,
    dueDayOfMonth: loan.dueDayOfMonth,
    endDate: loan.endDate.toISOString(),
    active: loan.active,
    createdAt: loan.createdAt.toISOString(),
  };
}
