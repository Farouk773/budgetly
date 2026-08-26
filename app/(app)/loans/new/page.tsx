"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currencySymbol, parseEurosToCents } from "@/backend/money";
import type { ApiError } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export default function NewLoanPage() {
  const router = useRouter();
  const currency = useCurrency();
  const [name, setName] = useState("");
  const [remaining, setRemaining] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [rate, setRate] = useState("");
  const [dueDayOfMonth, setDueDayOfMonth] = useState("1");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasDraft =
    name.trim() !== "" ||
    remaining.trim() !== "" ||
    monthlyPayment.trim() !== "" ||
    rate.trim() !== "" ||
    endDate.trim() !== "";

  function resetForm() {
    setName("");
    setRemaining("");
    setMonthlyPayment("");
    setRate("");
    setDueDayOfMonth("1");
    setEndDate("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const remainingCents = parseEurosToCents(remaining);
    const monthlyPaymentCents = parseEurosToCents(monthlyPayment);
    if (remainingCents === null || monthlyPaymentCents === null) {
      setError("Montant invalide");
      return;
    }

    const ratePercent = rate.trim() === "" ? 0 : parseFloat(rate.replace(",", "."));
    if (Number.isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      setError("Taux invalide");
      return;
    }
    const annualRateBps = Math.round(ratePercent * 100);

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          remainingCents: String(remainingCents),
          monthlyPaymentCents: String(monthlyPaymentCents),
          annualRateBps,
          dueDayOfMonth: Number(dueDayOfMonth),
          endDate,
        }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      router.push("/loans");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Ajouter un prêt</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Nom
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Prêt auto, Prêt immobilier..."
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="remaining"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Montant restant dû ({currencySymbol(currency)})
          </label>
          <input
            id="remaining"
            type="text"
            inputMode="decimal"
            required
            value={remaining}
            onChange={(e) => setRemaining(e.target.value)}
            placeholder="10000,00"
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="monthlyPayment"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Mensualité ({currencySymbol(currency)})
          </label>
          <input
            id="monthlyPayment"
            type="text"
            inputMode="decimal"
            required
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            placeholder="300,00"
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="rate" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Taux annuel (%) — optionnel
          </label>
          <input
            id="rate"
            type="text"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="3,50"
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="dueDayOfMonth"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Jour de prélèvement dans le mois
          </label>
          <input
            id="dueDayOfMonth"
            type="number"
            min={1}
            max={31}
            required
            value={dueDayOfMonth}
            onChange={(e) => setDueDayOfMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="endDate"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Date de fin prévue
          </label>
          <input
            id="endDate"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
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
