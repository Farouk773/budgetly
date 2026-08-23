import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { INCOME_TYPE_LABELS } from "@/lib/types";

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
        <h1 className="text-xl font-semibold text-zinc-900">
          Historique des revenus
        </h1>
        <Link
          href="/incomes/new"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Ajouter un revenu
        </Link>
      </div>

      {incomes.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">
          Aucun revenu enregistré pour le moment.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {incomes.map((income) => (
            <li key={income.id}>
              <Link
                href={`/incomes/${income.id}/edit`}
                className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-zinc-50"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {income.label || INCOME_TYPE_LABELS[income.type]}
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      {INCOME_TYPE_LABELS[income.type]}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {MONTH_FORMATTER.format(income.periodMonth)}
                    {income.payslipOriginalName ? " · fiche de paie jointe" : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-zinc-900">
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
