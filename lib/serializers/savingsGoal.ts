import type { SavingsGoal as PrismaSavingsGoal } from "@/lib/generated/prisma/client";
import type { SavingsGoal } from "@/lib/types";

export function toSavingsGoalDto(goal: PrismaSavingsGoal): SavingsGoal {
  return {
    id: goal.id,
    name: goal.name,
    targetCents: goal.targetCents,
    currentCents: goal.currentCents,
    targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
    createdAt: goal.createdAt.toISOString(),
  };
}
