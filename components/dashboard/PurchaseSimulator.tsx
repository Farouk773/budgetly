"use client";

import { useState } from "react";
import { currencySymbol, formatCents, parseEurosToCents } from "@/backend/money";
import type { ApiError, PurchaseSimulation } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export function PurchaseSimulator() {
  const currency = useCurrency();
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<PurchaseSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const amountCents = parseEurosToCents(amount);
    if (amountCents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/balance/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: String(amountCents) }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError((data as ApiError).error ?? "Une erreur est survenue");
        return;
      }

      setResult(data as PurchaseSimulation);
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card-surface p-5">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Puis-je me permettre cette dépense ?
      </p>

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Montant en ${currencySymbol(currency)}`}
          className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          Vérifier
        </Button>
      </form>

      {error && (
        <p className="animate-fade-in mt-2 text-sm text-amber-800 dark:text-amber-400">{error}</p>
      )}

      {result && (
        <p
          className={`animate-fade-in mt-3 rounded-lg px-3 py-2 text-sm ${
            result.affordable
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          }`}
        >
          {result.affordable
            ? `Oui, il te resterait ${formatCents(result.balanceAfterCents, currency)}.`
            : `Non, tu passerais à découvert (${formatCents(
                result.balanceAfterCents,
                currency
              )}).`}
        </p>
      )}
    </div>
  );
}
