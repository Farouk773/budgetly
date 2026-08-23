import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";

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
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900">
          Dépenses ponctuelles
        </h1>
        <Link
          href="/expenses/new"
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" />
          Ajouter une dépense
        </Link>
      </div>

      {expenses.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          Aucune dépense enregistrée pour le moment.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {expense.label || expense.category.name}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {expense.category.name}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {DATE_FORMATTER.format(expense.date)}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {formatCents(expense.amountCents)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
