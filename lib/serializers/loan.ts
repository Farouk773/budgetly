import type { Loan as PrismaLoan } from "@/lib/generated/prisma/client";
import type { Loan } from "@/lib/types";

export function toLoanDto(loan: PrismaLoan): Loan {
  return {
    id: loan.id,
    name: loan.name,
    remainingCents: loan.remainingCents,
    monthlyPaymentCents: loan.monthlyPaymentCents,
    annualRateBps: loan.annualRateBps,
    endDate: loan.endDate.toISOString(),
    active: loan.active,
    createdAt: loan.createdAt.toISOString(),
  };
}
