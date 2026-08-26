"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currencySymbol, formatCents, parseEurosToCents } from "@/backend/money";
import type { ApiError, EarlyRepaymentSimulation, Loan } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notifyAnalyticsChanged } from "@/components/dashboard/analytics/analyticsBus";
import { useCurrency } from "@/components/providers/CurrencyProvider";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
});

export function LoanCard({ loan }: { loan: Loan }) {
  const router = useRouter();
  const currency = useCurrency();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [simulation, setSimulation] = useState<EarlyRepaymentSimulation | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountCents = parseEurosToCents(paymentAmount);
    if (amountCents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/loans/${loan.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: String(amountCents) }),
      });
      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }
      setPaymentAmount("");
      router.refresh();
      notifyAnalyticsChanged();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSimulation(null);
    const extraCents = parseEurosToCents(extraAmount);
    if (extraCents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/loans/${loan.id}/simulate-early-repayment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extraPaymentCents: String(extraCents) }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError((data as ApiError).error ?? "Une erreur est survenue");
        return;
      }
      setSimulation(data as EarlyRepaymentSimulation);
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsSubmitting(true);
    try {
      await fetch(`/api/loans/${loan.id}`, { method: "DELETE" });
      router.refresh();
      notifyAnalyticsChanged();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <li className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {loan.name}
          {!loan.active && (
            <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
              Remboursé
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isSubmitting}
          className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          Supprimer
        </button>
      </div>

      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Restant dû : <strong>{formatCents(loan.remainingCents, currency)}</strong> ·
        Mensualité : {formatCents(loan.monthlyPaymentCents, currency)} · Taux :{" "}
        {(loan.annualRateBps / 100).toFixed(2)}% · Échéance :{" "}
        {DATE_FORMATTER.format(new Date(loan.endDate))}
      </div>

      {loan.active && (
        <>
          <form onSubmit={handlePayment} className="mt-3 flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={`Enregistrer un paiement (${currencySymbol(currency)})`}
              className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
            />
            <Button type="submit" size="sm" disabled={isSubmitting}>
              Payer
            </Button>
          </form>

          <form onSubmit={handleSimulate} className="mt-2 flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={extraAmount}
              onChange={(e) => setExtraAmount(e.target.value)}
              placeholder={`Simuler un remboursement anticipé (${currencySymbol(currency)})`}
              className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={isSubmitting}>
              Simuler
            </Button>
          </form>
        </>
      )}

      {error && (
        <p className="animate-fade-in mt-2 text-xs text-amber-800 dark:text-amber-400">{error}</p>
      )}

      {simulation && (
        <p className="animate-fade-in mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300">
          Tu finirais {simulation.monthsSaved} mois plus tôt et économiserais{" "}
          {formatCents(simulation.interestSavedCents, currency)} d&apos;intérêts.
        </p>
      )}

      <ConfirmDialog
        open={isConfirmingDelete}
        title="Supprimer ce prêt ?"
        description="Cette action est définitive et ne peut pas être annulée."
        confirmLabel="Supprimer"
        isSubmitting={isSubmitting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </li>
  );
}
