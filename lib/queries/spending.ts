import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/queries/balance";

export type CategoryBreakdownEntry = {
  categoryId: string;
  categoryName: string;
  isEssential: boolean;
  amountCents: number;
};

/** Combines this month's one-off expenses with all active recurring charges,
 * grouped by category — the "where does my money go" view for the dashboard. */
export async function getSpendingByCategory(
  userId: string,
  month: string
): Promise<CategoryBreakdownEntry[]> {
  const range = monthRange(month);

  const [expenses, fixedCharges] = await Promise.all([
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { userId, date: range },
      _sum: { amountCents: true },
    }),
    prisma.fixedCharge.groupBy({
      by: ["categoryId"],
      where: { userId, active: true },
      _sum: { amountCents: true },
    }),
  ]);

  const totalsByCategory = new Map<string, number>();
  for (const row of [...expenses, ...fixedCharges]) {
    const amount = row._sum.amountCents ?? 0;
    totalsByCategory.set(
      row.categoryId,
      (totalsByCategory.get(row.categoryId) ?? 0) + amount
    );
  }

  if (totalsByCategory.size === 0) return [];

  const categories = await prisma.category.findMany({
    where: { id: { in: [...totalsByCategory.keys()] } },
  });
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return [...totalsByCategory.entries()]
    .map(([categoryId, amountCents]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        categoryName: category?.name ?? "Autre",
        isEssential: category?.isEssential ?? true,
        amountCents,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);
}
