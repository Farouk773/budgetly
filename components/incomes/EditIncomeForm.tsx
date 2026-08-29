"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currencySymbol, formatCents, parseEurosToCents } from "@/backend/money";
import type { ApiError, Income, IncomeType } from "@/backend/types";
import { INCOME_TYPE_LABELS } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { useCurrency } from "@/components/providers/CurrencyProvider";

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) return month;
  return MONTH_LABEL_FORMATTER.format(new Date(year, monthIndex - 1, 1));
}

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
  const [isRecurring, setIsRecurring] = useState(income.isRecurring);
  const [payDay, setPayDay] = useState(
    income.payDay !== null ? String(income.payDay) : ""
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
          isRecurring: String(isRecurring),
          payDay: payDay.trim() !== "" ? payDay.trim() : undefined,
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
        <Select
          id="type"
          value={type}
          onChange={(value) => setType(value as IncomeType)}
          options={Object.entries(INCOME_TYPE_LABELS).map(([value, text]) => ({
            value,
            label: text,
          }))}
        />
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

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:bg-transparent dark:focus:ring-indigo-500/20"
          />
          Revenu récurrent (même montant chaque mois)
        </label>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Compté automatiquement chaque mois à partir de{" "}
          {formatMonthLabel(month)}, jusqu&apos;à ce que tu le modifies ou
          décoches cette case.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="payDay" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Jour de versement habituel (optionnel)
        </label>
        <input
          id="payDay"
          type="number"
          min={1}
          max={31}
          value={payDay}
          onChange={(e) => setPayDay(e.target.value)}
          placeholder="Ex : 28"
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Sert à repérer si tes charges ou prêts sont prélevés avant que ce revenu
          n&apos;arrive dans le mois. Laisse vide si tu ne le sais pas encore — on
          part du principe prudent qu&apos;il arrive en fin de mois.
        </span>
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
          variant="secondary"
          onClick={() => router.push("/incomes")}
          disabled={isSubmitting}
        >
          Annuler
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
