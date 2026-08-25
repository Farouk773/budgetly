import type { Income as PrismaIncome } from "@/backend/generated/prisma/client";
import type { Income } from "@/backend/types";

export function toIncomeDto(income: PrismaIncome): Income {
  return {
    id: income.id,
    type: income.type,
    label: income.label,
    netAmountCents: income.netAmountCents,
    grossAmountCents: income.grossAmountCents,
    contributionsCents: income.contributionsCents,
    bonusCents: income.bonusCents,
    overtimeCents: income.overtimeCents,
    periodMonth: income.periodMonth.toISOString(),
    payslipOriginalName: income.payslipOriginalName,
    createdAt: income.createdAt.toISOString(),
  };
}
