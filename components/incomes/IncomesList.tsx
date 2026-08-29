"use client";

import Link from "next/link";
import { formatCents } from "@/backend/money";
import type { Currency, IncomeType } from "@/backend/types";
import { INCOME_TYPE_LABELS } from "@/backend/types";
import { RowDeleteButton } from "@/components/ui/RowDeleteButton";

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

export type IncomeListItem = {
  id: string;
  type: IncomeType;
  label: string | null;
  netAmountCents: number;
  periodMonth: Date;
  isRecurring: boolean;
  payslipOriginalName: string | null;
};

export function IncomesList({
  incomes,
  currency,
}: {
  incomes: IncomeListItem[];
  currency?: Currency;
}) {
  if (incomes.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Aucun revenu enregistré pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {incomes.map((income) => (
        <li
          key={income.id}
          className="card-surface flex items-center justify-between gap-2 p-5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
        >
          <Link
            href={`/incomes/${income.id}/edit`}
            className="flex flex-1 items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {income.label || INCOME_TYPE_LABELS[income.type]}
                <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                  {INCOME_TYPE_LABELS[income.type]}
                </span>
                {income.isRecurring && (
                  <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    Récurrent
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {MONTH_FORMATTER.format(income.periodMonth)}
                {income.payslipOriginalName ? " · fiche de paie jointe" : ""}
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCents(income.netAmountCents, currency)}
            </p>
          </Link>
          <RowDeleteButton
            endpoint={`/api/incomes/${income.id}`}
            ariaLabel={`Supprimer le revenu ${income.label || INCOME_TYPE_LABELS[income.type]}`}
            confirmTitle="Supprimer ce revenu ?"
            confirmDescription="Cette action est définitive et ne peut pas être annulée."
          />
        </li>
      ))}
    </ul>
  );
}
