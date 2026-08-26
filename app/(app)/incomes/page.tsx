import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { formatCents } from "@/backend/money";
import { INCOME_TYPE_LABELS } from "@/backend/types";
import { RevenuAnalyticsChart } from "@/components/dashboard/analytics/RevenuAnalyticsChart";

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

export default async function IncomesPage() {
  const user = await getCurrentUser();
  const incomes = user
    ? await prisma.income.findMany({
        where: { userId: user.id },
        orderBy: { periodMonth: "desc" },
      })
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
          Historique des revenus
        </h1>
        <Link
          href="/incomes/new"
          className="btn-base bg-brand-gradient flex items-center gap-1.5 px-3 py-2 text-sm text-white shadow-md shadow-indigo-900/15 hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Ajouter un revenu
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {incomes.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucun revenu enregistré pour le moment.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {incomes.map((income) => (
                <li key={income.id}>
                  <Link
                    href={`/incomes/${income.id}/edit`}
                    className="card-surface flex items-center justify-between p-5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {income.label || INCOME_TYPE_LABELS[income.type]}
                        <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                          {INCOME_TYPE_LABELS[income.type]}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {MONTH_FORMATTER.format(income.periodMonth)}
                        {income.payslipOriginalName ? " · fiche de paie jointe" : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatCents(income.netAmountCents, user?.currency)}
                    </p>
                  </Link>
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
              <RevenuAnalyticsChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
