"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { currencySymbol, formatCents, parseEurosToCents } from "@/backend/money";
import type { ApiError, Income, IncomeType } from "@/backend/types";
import { INCOME_TYPE_LABELS } from "@/backend/types";
import { Button } from "@/components/ui/Button";
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

export function QuickIncomeCard({
  month,
  incomes,
}: {
  month: string;
  incomes: Income[];
}) {
  const router = useRouter();
  const currency = useCurrency();
  const [type, setType] = useState<IncomeType>("SALARY");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [payDay, setPayDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const netAmountCents = parseEurosToCents(amount);
    if (netAmountCents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("type", type);
      if (label.trim()) formData.set("label", label.trim());
      formData.set("netAmountCents", String(netAmountCents));
      formData.set("periodMonth", `${month}-01`);
      formData.set("isRecurring", String(isRecurring));
      if (payDay.trim() !== "") formData.set("payDay", payDay);

      const res = await fetch("/api/incomes", { method: "POST", body: formData });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      setAmount("");
      setLabel("");
      setIsRecurring(false);
      setPayDay("");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasDraft =
    amount.trim() !== "" || label.trim() !== "" || isRecurring || payDay.trim() !== "";

  function resetForm() {
    setAmount("");
    setLabel("");
    setIsRecurring(false);
    setPayDay("");
    setError(null);
  }

  return (
    <div className="card-surface p-5">
      <p className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        Revenus de ce mois
      </p>

      {incomes.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Aucun revenu enregistré pour ce mois pour l&apos;instant.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-slate-100 text-sm dark:divide-white/10">
          {incomes.map((income) => (
            <li key={income.id} className="flex justify-between py-1.5">
              <span className="text-slate-600 dark:text-slate-400">
                {income.label || INCOME_TYPE_LABELS[income.type]}
                {income.isRecurring && (
                  <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    Récurrent
                  </span>
                )}
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {formatCents(income.netAmountCents, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as IncomeType)}
            className="rounded-lg border border-slate-300 bg-transparent px-2 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:bg-[#131a2e] dark:focus:ring-indigo-500/20"
          >
            {Object.entries(INCOME_TYPE_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Montant (${currencySymbol(currency)})`}
            className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (optionnel)"
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:bg-transparent dark:focus:ring-indigo-500/20"
          />
          Revenu récurrent (même montant chaque mois)
        </label>
        {isRecurring && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Compté automatiquement chaque mois à partir de{" "}
            {formatMonthLabel(month)}, jusqu&apos;à ce que tu le modifies ou
            décoches cette case.
          </span>
        )}
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
        {error && (
          <p className="animate-fade-in text-xs text-amber-800 dark:text-amber-400">{error}</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Ajout..." : "Ajouter ce revenu"}
          </Button>
          {hasDraft && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Annuler
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
