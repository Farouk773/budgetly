"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents, parseSignedEurosToCents } from "@/lib/money";
import type { ApiError } from "@/lib/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function BalanceCard({
  balanceCents,
  balanceAsOf,
  isCurrentMonth = true,
}: {
  balanceCents: number | null;
  balanceAsOf: string | null;
  isCurrentMonth?: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(balanceCents === null);
  const [value, setValue] = useState(
    balanceCents !== null ? (balanceCents / 100).toFixed(2).replace(".", ",") : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cents = parseSignedEurosToCents(value);
    if (cents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/balance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balanceCents: String(cents) }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
      >
        <label htmlFor="balance" className="text-sm font-medium text-slate-700">
          Solde total actuel (tous comptes, €)
        </label>
        <input
          id="balance"
          type="text"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="1200,00"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
        {error && <p className="text-sm text-amber-800">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Enregistrer"}
          </button>
          {balanceCents !== null && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div>
        <p className="text-sm text-slate-500">Solde total actuel</p>
        <p className="text-lg font-semibold text-slate-900">
          {formatCents(balanceCents ?? 0)}
        </p>
        {balanceAsOf && (
          <p className="text-xs text-slate-400">
            Mis à jour le {DATE_FORMATTER.format(new Date(balanceAsOf))}
          </p>
        )}
        {!isCurrentMonth && (
          <p className="mt-1 text-xs italic text-slate-400">
            Indépendant du mois affiché — c&apos;est ton solde d&apos;aujourd&apos;hui
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Modifier
      </button>
    </div>
  );
}
