import type {
  Category as PrismaCategory,
  FixedCharge as PrismaFixedCharge,
} from "@/lib/generated/prisma/client";
import type { FixedCharge } from "@/lib/types";

export function toFixedChargeDto(
  fixedCharge: PrismaFixedCharge & { category: PrismaCategory }
): FixedCharge {
  return {
    id: fixedCharge.id,
    categoryId: fixedCharge.categoryId,
    category: fixedCharge.category,
    label: fixedCharge.label,
    amountCents: fixedCharge.amountCents,
    dayOfMonth: fixedCharge.dayOfMonth,
    active: fixedCharge.active,
    createdAt: fixedCharge.createdAt.toISOString(),
  };
}
