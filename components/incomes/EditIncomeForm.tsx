"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currencySymbol, formatCents, parseEurosToCents } from "@/backend/money";
import type { ApiError, Income, IncomeType } from "@/backend/types";
import { INCOME_TYPE_LABELS } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export function EditIncomeForm({ income }: { income: Income }) {
  const router = useRouter();
  const currency = useCurrency();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [type, setType] = useState<IncomeType>(income.type);
  const [label, setLabel] = useState(income.label ?? "");
  const [month, setMonth] = useState(income.periodMonth.slice(0, 7));
  const [netAmount, setNetAmount] = useState(
    (income.netAmountCents / 100).toFixed(2).replace(".", ",")
  );
  const [grossAmount, setGrossAmount] = useState(
    income.grossAmountCents !== null
      ? (income.grossAmountCents / 100).toFixed(2).replace(".", ",")
      : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const netAmountCents = parseEurosToCents(netAmount);
    if (netAmountCents === null) {
      setError("Montant net invalide");
      return;
    }

    const grossAmountCents =
      grossAmount.trim() === "" ? null : parseEurosToCents(grossAmount);
    if (grossAmount.trim() !== "" && grossAmountCents === null) {
      setError("Montant brut invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/incomes/${income.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          label: label.trim() || undefined,
          netAmountCents: String(netAmountCents),
          grossAmountCents:
            grossAmountCents !== null ? String(grossAmountCents) : undefined,
          periodMonth: `${month}-01`,
        }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      router.push("/incomes");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsSubmitting(true);
    try {
      await fetch(`/api/incomes/${income.id}`, { method: "DELETE" });
      router.push("/incomes");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as IncomeType)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        >
          {Object.entries(INCOME_TYPE_LABELS).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="label" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Libellé (optionnel)
        </label>
        <input
          id="label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="month" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Mois concerné
        </label>
        <input
          id="month"
          type="month"
          required
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="netAmount"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Montant net perçu ({currencySymbol(currency)})
        </label>
        <input
          id="netAmount"
          type="text"
          inputMode="decimal"
          required
          value={netAmount}
          onChange={(e) => setNetAmount(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="grossAmount"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Montant brut (optionnel)
        </label>
        <input
          id="grossAmount"
          type="text"
          inputMode="decimal"
          value={grossAmount}
          onChange={(e) => setGrossAmount(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      {income.payslipOriginalName && (
        <a
          href={`/api/incomes/${income.id}/payslip`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Voir la fiche de paie jointe ({income.payslipOriginalName})
        </a>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Montant actuellement enregistré : {formatCents(income.netAmountCents, currency)}
      </p>

      {error && (
        <p className="animate-fade-in rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {error}
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isSubmitting}
        >
          Supprimer
        </Button>
      </div>

      <ConfirmDialog
        open={isConfirmingDelete}
        title="Supprimer ce revenu ?"
        description="Cette action est définitive et ne peut pas être annulée."
        confirmLabel="Supprimer"
        isSubmitting={isSubmitting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </form>
  );
}
