"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents, parseEurosToCents } from "@/lib/money";
import type { ApiError, EarlyRepaymentSimulation, Loan } from "@/lib/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
});

export function LoanCard({ loan }: { loan: Loan }) {
  const router = useRouter();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [simulation, setSimulation] = useState<EarlyRepaymentSimulation | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">
          {loan.name}
          {!loan.active && (
            <span className="ml-2 text-xs font-normal text-emerald-600">
              Remboursé
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Supprimer
        </button>
      </div>

      <div className="mt-1 text-xs text-zinc-500">
        Restant dû : <strong>{formatCents(loan.remainingCents)}</strong> ·
        Mensualité : {formatCents(loan.monthlyPaymentCents)} · Taux :{" "}
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
              placeholder="Enregistrer un paiement (€)"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              Payer
            </button>
          </form>

          <form onSubmit={handleSimulate} className="mt-2 flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={extraAmount}
              onChange={(e) => setExtraAmount(e.target.value)}
              placeholder="Simuler un remboursement anticipé (€)"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Simuler
            </button>
          </form>
        </>
      )}

      {error && <p className="mt-2 text-xs text-amber-800">{error}</p>}

      {simulation && (
        <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          Tu finirais {simulation.monthsSaved} mois plus tôt et économiserais{" "}
          {formatCents(simulation.interestSavedCents)} d&apos;intérêts.
        </p>
      )}
    </li>
  );
}
