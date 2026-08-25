import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { formatCents } from "@/backend/money";
import { currentMonthValue, getMonthlyBudget, getRunningBalance } from "@/backend/queries/balance";
import { toSavingsGoalDto } from "@/backend/serializers/savingsGoal";
import { SavingsGoalCard } from "@/components/savings/SavingsGoalCard";

export default async function SavingsPage() {
  const user = await getCurrentUser();
  const month = currentMonthValue();

  const [goals, budget, running] = user
    ? await Promise.all([
        prisma.savingsGoal.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        }),
        getMonthlyBudget(user.id, month),
        getRunningBalance(user.id, month),
      ])
    : [[], null, null];

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

      {running && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-slate-500">
              Argent disponible au total, tout compris
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {formatCents(running.startingBalanceCents)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Tu peux épargner plus que la suggestion ci-dessous si ce total
              te le permet — c&apos;est juste une suggestion, pas une limite.
            </p>
          </div>
        </div>
      )}

      {budget && budget.suggestedSavingsCents > 0 && (
        <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
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
