"use client";

import Link from "next/link";
import { formatCents } from "@/backend/money";
import type { Currency } from "@/backend/types";
import { RowDeleteButton } from "@/components/ui/RowDeleteButton";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export type ExpenseListItem = {
  id: string;
  label: string | null;
  categoryName: string;
  amountCents: number;
  date: Date;
};

export function ExpensesList({
  expenses,
  currency,
}: {
  expenses: ExpenseListItem[];
  currency?: Currency;
}) {
  if (expenses.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Aucune dépense enregistrée pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="card-surface flex items-center justify-between gap-2 p-5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
        >
          <Link
            href={`/expenses/${expense.id}/edit`}
            className="flex flex-1 items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {expense.label || expense.categoryName}
                <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                  {expense.categoryName}
                </span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {DATE_FORMATTER.format(expense.date)}
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCents(expense.amountCents, currency)}
            </p>
          </Link>
          <RowDeleteButton
            endpoint={`/api/expenses/${expense.id}`}
            ariaLabel={`Supprimer la dépense ${expense.label || expense.categoryName}`}
            confirmTitle="Supprimer cette dépense ?"
            confirmDescription="Cette action est définitive et ne peut pas être annulée."
          />
        </li>
      ))}
    </ul>
  );
}
