import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { formatCents } from "@/backend/money";
import { currentMonthValue, getMonthlyBudget, getRunningBalance } from "@/backend/queries/balance";
import { toSavingsGoalDto } from "@/backend/serializers/savingsGoal";
import { SavingsGoalCard } from "@/components/savings/SavingsGoalCard";
import { EpargneAnalyticsChart } from "@/components/dashboard/analytics/EpargneAnalyticsChart";

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
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
          Objectifs d&apos;épargne
        </h1>
        <Link
          href="/savings/new"
          className="btn-base bg-brand-gradient flex items-center gap-1.5 px-3 py-2 text-sm text-white shadow-md shadow-indigo-900/15 hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Nouvel objectif
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {running && (
            <div className="card-elevated flex items-center gap-3 p-5">
              <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Argent disponible au total, tout compris
                </p>
                <p className="text-brand-gradient text-xl font-semibold">
                  {formatCents(running.startingBalanceCents, user?.currency)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  Tu peux épargner plus que la suggestion ci-dessous si ce total
                  te le permet — c&apos;est juste une suggestion, pas une limite.
                </p>
              </div>
            </div>
          )}

          {budget && budget.suggestedSavingsCents > 0 && (
            <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300">
              Vu ce qu&apos;il te reste ce mois-ci, tu pourrais mettre de côté
              environ <strong>{formatCents(budget.suggestedSavingsCents, user?.currency)}</strong>.
            </p>
          )}

          {goals.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
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

        <div className="lg:col-span-1">
          <div className="card-surface p-5 lg:sticky lg:top-24">
            <p className="font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">
              Évolution
            </p>
            <div className="mt-4">
              <EpargneAnalyticsChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
