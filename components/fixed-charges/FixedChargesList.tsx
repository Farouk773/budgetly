"use client";

import { formatCents } from "@/backend/money";
import type { Currency } from "@/backend/types";
import { RowDeleteButton } from "@/components/ui/RowDeleteButton";

export type FixedChargeListItem = {
  id: string;
  label: string;
  categoryName: string;
  amountCents: number;
  dayOfMonth: number;
  active: boolean;
};

export function FixedChargesList({
  fixedCharges,
  currency,
}: {
  fixedCharges: FixedChargeListItem[];
  currency?: Currency;
}) {
  if (fixedCharges.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Aucune charge fixe enregistrée pour le moment.
      </p>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {fixedCharges.map((charge) => (
        <li
          key={charge.id}
          className={`card-surface flex items-center justify-between gap-3 p-5 ${
            charge.active ? "" : "opacity-50"
          }`}
        >
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {charge.label}
              <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                {charge.categoryName}
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prélevé le {charge.dayOfMonth} du mois
              {charge.active ? "" : " · inactive"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCents(charge.amountCents, currency)}
            </p>
            <RowDeleteButton
              endpoint={`/api/fixed-charges/${charge.id}`}
              ariaLabel={`Supprimer la charge ${charge.label}`}
              confirmTitle="Supprimer cette charge fixe ?"
              confirmDescription="Cette action est définitive et ne peut pas être annulée."
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
