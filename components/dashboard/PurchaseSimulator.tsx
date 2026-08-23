"use client";

import { useState } from "react";
import { formatCents, parseEurosToCents } from "@/lib/money";
import type { ApiError, PurchaseSimulation } from "@/lib/types";

export function PurchaseSimulator({
  hasDeclaredBalance,
}: {
  hasDeclaredBalance: boolean;
}) {
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
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-700">
        Puis-je me permettre cette dépense ?
      </p>

      {!hasDeclaredBalance ? (
        <p className="mt-2 text-sm text-zinc-500">
          Renseigne d&apos;abord ton solde actuel ci-dessus.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant en €"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            Vérifier
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-amber-800">{error}</p>}

      {result && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            result.affordable
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {result.affordable
            ? `Oui, il te resterait ${formatCents(result.balanceAfterCents)}.`
            : `Non, tu passerais à découvert (${formatCents(
                result.balanceAfterCents
              )}).`}
        </p>
      )}
    </div>
  );
}
