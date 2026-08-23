import { shiftMonth } from "./dateUtils";

/** Length of the current consecutive-month savings streak ending at
 * `currentMonth`. Doesn't penalize the in-progress month if it has no
 * contribution yet, but a full skipped month breaks the streak. */
export function computeSavingsStreakMonths(
  contributedMonths: string[],
  currentMonth: string
): number {
  const months = new Set(contributedMonths);
  let cursor = months.has(currentMonth)
    ? currentMonth
    : shiftMonth(currentMonth, -1);

  if (!months.has(cursor)) return 0;

  let streak = 0;
  while (months.has(cursor)) {
    streak += 1;
    cursor = shiftMonth(cursor, -1);
  }
  return streak;
}

export type MotivationContext = {
  availableCents: number;
  previousAvailableCents: number | null;
  savingsStreakMonths: number;
  hasCompletedSavingsGoal: boolean;
};

/** Picks a message from real, computed facts about the user's month —
 * never a generic placeholder, and never guilt-inducing on a bad month. */
export function generateMotivationMessage(ctx: MotivationContext): string {
  if (ctx.savingsStreakMonths >= 3) {
    return `Tu épargnes depuis ${ctx.savingsStreakMonths} mois d'affilée, continue comme ça !`;
  }
  if (ctx.hasCompletedSavingsGoal) {
    return "Tu as déjà atteint un de tes objectifs d'épargne, bravo !";
  }
  if (ctx.availableCents < 0) {
    return "Ce mois est un peu tendu, mais tu gardes le contrôle en suivant tes finances de près.";
  }
  if (
    ctx.previousAvailableCents !== null &&
    ctx.availableCents > ctx.previousAvailableCents
  ) {
    return "Tu t'en sors mieux que le mois dernier, bien joué !";
  }
  if (ctx.availableCents > 0) {
    return "Ton budget est équilibré ce mois-ci, continue sur cette lancée.";
  }
  return "Chaque mois compte : continue à suivre ton budget de près.";
}

export type Badge = {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
};

export type BadgeContext = {
  savingsStreakMonths: number;
  hasCompletedSavingsGoal: boolean;
  hasPaidOffLoan: boolean;
  hasDeclaredBalance: boolean;
};

/** All badges are backed by real, persisted data — no fabricated metrics. */
export function evaluateBadges(ctx: BadgeContext): Badge[] {
  return [
    {
      id: "balance-declared",
      name: "Vue d'ensemble",
      description: "Tu as renseigné ton solde total actuel",
      achieved: ctx.hasDeclaredBalance,
    },
    {
      id: "savings-streak-3",
      name: "3 mois d'épargne d'affilée",
      description: "Tu as épargné au moins 3 mois de suite",
      achieved: ctx.savingsStreakMonths >= 3,
    },
    {
      id: "savings-streak-6",
      name: "Épargnant régulier",
      description: "Tu as épargné 6 mois de suite",
      achieved: ctx.savingsStreakMonths >= 6,
    },
    {
      id: "goal-completed",
      name: "Objectif atteint",
      description: "Tu as atteint un objectif d'épargne",
      achieved: ctx.hasCompletedSavingsGoal,
    },
    {
      id: "loan-paid-off",
      name: "Dette effacée",
      description: "Tu as fini de rembourser un prêt",
      achieved: ctx.hasPaidOffLoan,
    },
  ];
}
