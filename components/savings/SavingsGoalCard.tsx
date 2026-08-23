"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents, parseEurosToCents } from "@/lib/money";
import type { ApiError, SavingsGoal } from "@/lib/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function SavingsGoalCard({ goal }: { goal: SavingsGoal }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = Math.min(
    100,
    Math.round((goal.currentCents / Math.max(goal.targetCents, 1)) * 100)
  );

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountCents = parseEurosToCents(amount);
    if (amountCents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/savings-goals/${goal.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: String(amountCents) }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      setAmount("");
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
      await fetch(`/api/savings-goals/${goal.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">{goal.name}</p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Supprimer
        </button>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-teal-600"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {formatCents(goal.currentCents)} / {formatCents(goal.targetCents)} (
          {progress}%)
        </span>
        {goal.targetDate && (
          <span>Objectif : {DATE_FORMATTER.format(new Date(goal.targetDate))}</span>
        )}
      </div>

      <form onSubmit={handleContribute} className="mt-3 flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ajouter un montant (€)"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-amber-800">{error}</p>}
    </li>
  );
}
