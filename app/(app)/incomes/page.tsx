import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { formatCents } from "@/backend/money";
import { INCOME_TYPE_LABELS } from "@/backend/types";

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
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900">
          Historique des revenus
        </h1>
        <Link
          href="/incomes/new"
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" />
          Ajouter un revenu
        </Link>
      </div>

      {incomes.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          Aucun revenu enregistré pour le moment.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {incomes.map((income) => (
            <li key={income.id}>
              <Link
                href={`/incomes/${income.id}/edit`}
                className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-colors hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {income.label || INCOME_TYPE_LABELS[income.type]}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {INCOME_TYPE_LABELS[income.type]}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {MONTH_FORMATTER.format(income.periodMonth)}
                    {income.payslipOriginalName ? " · fiche de paie jointe" : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCents(income.netAmountCents)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
