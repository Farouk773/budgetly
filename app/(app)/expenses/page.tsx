import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { formatCents } from "@/backend/money";
import { DepensesAnalyticsChart } from "@/components/dashboard/analytics/DepensesAnalyticsChart";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  const expenses = user
    ? await prisma.expense.findMany({
        where: { userId: user.id },
        include: { category: true },
        orderBy: { date: "desc" },
      })
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
          Dépenses ponctuelles
        </h1>
        <Link
          href="/expenses/new"
          className="btn-base bg-brand-gradient flex items-center gap-1.5 px-3 py-2 text-sm text-white shadow-md shadow-indigo-900/15 hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Ajouter une dépense
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucune dépense enregistrée pour le moment.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {expenses.map((expense) => (
                <li key={expense.id} className="card-surface flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {expense.label || expense.category.name}
                      <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                        {expense.category.name}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {DATE_FORMATTER.format(expense.date)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatCents(expense.amountCents)}
                  </p>
                </li>
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
              <DepensesAnalyticsChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
