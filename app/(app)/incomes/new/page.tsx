"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currencySymbol, parseEurosToCents } from "@/backend/money";
import type { ApiError, IncomeType } from "@/backend/types";
import { INCOME_TYPE_LABELS } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/components/providers/CurrencyProvider";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) return month;
  return MONTH_LABEL_FORMATTER.format(new Date(year, monthIndex - 1, 1));
}

export default function NewIncomePage() {
  const router = useRouter();
  const currency = useCurrency();
  const [type, setType] = useState<IncomeType>("SALARY");
  const [label, setLabel] = useState("");
  const [month, setMonth] = useState(currentMonthValue());
  const [netAmount, setNetAmount] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [payslip, setPayslip] = useState<File | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [payDay, setPayDay] = useState("");
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
      const formData = new FormData();
      formData.set("type", type);
      if (label.trim()) formData.set("label", label.trim());
      formData.set("netAmountCents", String(netAmountCents));
      if (grossAmountCents !== null) {
        formData.set("grossAmountCents", String(grossAmountCents));
      }
      formData.set("periodMonth", `${month}-01`);
      formData.set("isRecurring", String(isRecurring));
      if (payDay.trim() !== "") formData.set("payDay", payDay);
      if (payslip) formData.set("payslip", payslip);

      const res = await fetch("/api/incomes", {
        method: "POST",
        body: formData,
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

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
        Ajouter un revenu
      </h1>

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
            placeholder="Ex : employeur, client..."
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
            placeholder="1500,00"
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
            placeholder="2000,00"
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="payslip"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Fiche de paie (optionnel)
          </label>
          <input
            id="payslip"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setPayslip(e.target.files?.[0] ?? null)}
            className="text-sm text-slate-600 dark:text-slate-400"
          />
          <span className="text-xs text-slate-400 dark:text-slate-500">
            PDF ou image, 10 Mo maximum. L&apos;extraction automatique arrive
            dans une prochaine phase — renseigne les montants toi-même pour
            l&apos;instant.
          </span>
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

        {error && (
          <p className="animate-fade-in rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            {error}
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Ajout..." : "Ajouter"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/incomes")}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
