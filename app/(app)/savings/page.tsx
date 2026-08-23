import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { currentMonthValue, getMonthlyBudget } from "@/lib/queries/balance";
import { toSavingsGoalDto } from "@/lib/serializers/savingsGoal";
import { SavingsGoalCard } from "@/components/savings/SavingsGoalCard";

export default async function SavingsPage() {
  const user = await getCurrentUser();

  const [goals, budget] = user
    ? await Promise.all([
        prisma.savingsGoal.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        }),
        getMonthlyBudget(user.id, currentMonthValue()),
      ])
    : [[], null];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900">
          Objectifs d&apos;épargne
        </h1>
        <Link
          href="/savings/new"
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" />
          Nouvel objectif
        </Link>
      </div>

      {budget && budget.suggestedSavingsCents > 0 && (
        <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          Vu ce qu&apos;il te reste ce mois-ci, tu pourrais mettre de côté
          environ <strong>{formatCents(budget.suggestedSavingsCents)}</strong>.
        </p>
      )}

      {goals.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          Aucun objectif d&apos;épargne pour le moment.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {goals.map((goal) => (
            <SavingsGoalCard key={goal.id} goal={toSavingsGoalDto(goal)} />
          ))}
        </ul>
      )}
    </div>
  );
}
