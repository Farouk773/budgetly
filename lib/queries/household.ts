import { prisma } from "@/lib/prisma";
import { combineMonthlyBudgets } from "@/lib/finance";
import { currentMonthValue, getMonthlyBudget } from "@/lib/queries/balance";

export async function getPartnerLinks(userId: string) {
  return prisma.partnerLink.findMany({
    where: { OR: [{ requesterId: userId }, { partnerId: userId }] },
    include: { requester: true, partner: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAcceptedPartnerIds(userId: string): Promise<string[]> {
  const links = await prisma.partnerLink.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { partnerId: userId }],
    },
  });

  return links.map((link) =>
    link.requesterId === userId ? link.partnerId : link.requesterId
  );
}

export async function getHouseholdSummary(userId: string) {
  const month = currentMonthValue();
  const partnerIds = await getAcceptedPartnerIds(userId);
  const memberIds = [userId, ...partnerIds];

  const users = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, email: true, name: true },
  });

  const budgets = await Promise.all(
    memberIds.map((id) => getMonthlyBudget(id, month))
  );

  const members = memberIds.map((id, index) => {
    const user = users.find((u) => u.id === id)!;
    const budget = budgets[index];
    return {
      userId: id,
      name: user.name,
      email: user.email,
      incomeCents: budget.incomeCents,
      fixedChargesCents: budget.fixedChargesCents,
      loanPaymentsCents: budget.loanPaymentsCents,
      expensesCents: budget.expensesCents,
      availableCents: budget.availableCents,
    };
  });

  return { month, members, combined: combineMonthlyBudgets(budgets) };
}
