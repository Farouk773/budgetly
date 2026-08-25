import type {
  Category as PrismaCategory,
  Expense as PrismaExpense,
} from "@/backend/generated/prisma/client";
import type { Expense } from "@/backend/types";

export function toExpenseDto(
  expense: PrismaExpense & { category: PrismaCategory }
): Expense {
  return {
    id: expense.id,
    categoryId: expense.categoryId,
    category: expense.category,
    label: expense.label,
    amountCents: expense.amountCents,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
  };
}
