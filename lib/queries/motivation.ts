import { prisma } from "@/lib/prisma";
import { shiftMonth } from "@/lib/dateUtils";
import {
  computeSavingsStreakMonths,
  evaluateBadges,
  generateMotivationMessage,
} from "@/lib/motivation";
import { currentMonthValue, getMonthlyBudget } from "@/lib/queries/balance";

export async function getMotivationSnapshot(userId: string) {
  const currentMonth = currentMonthValue();
  const previousMonth = shiftMonth(currentMonth, -1);

  const [contributions, goals, loans, user, currentBudget, previousBudget] =
    await Promise.all([
      prisma.savingsContribution.findMany({
        where: { userId },
        select: { createdAt: true },
      }),
      prisma.savingsGoal.findMany({ where: { userId } }),
      prisma.loan.findMany({ where: { userId } }),
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { balanceCents: true },
      }),
      getMonthlyBudget(userId, currentMonth),
      getMonthlyBudget(userId, previousMonth),
    ]);

  const contributedMonths = contributions.map((c) => {
    const d = c.createdAt;
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });

  const savingsStreakMonths = computeSavingsStreakMonths(
    contributedMonths,
    currentMonth
  );
  const hasCompletedSavingsGoal = goals.some(
    (g) => g.currentCents >= g.targetCents
  );
  const hasPaidOffLoan = loans.some((l) => !l.active && l.remainingCents === 0);
  const hasDeclaredBalance = user.balanceCents !== null;
  const previousHadData = previousBudget.incomeCents > 0;

  const message = generateMotivationMessage({
    availableCents: currentBudget.availableCents,
    previousAvailableCents: previousHadData ? previousBudget.availableCents : null,
    savingsStreakMonths,
    hasCompletedSavingsGoal,
  });

  const badges = evaluateBadges({
    savingsStreakMonths,
    hasCompletedSavingsGoal,
    hasPaidOffLoan,
    hasDeclaredBalance,
  });

  return { message, badges };
}
