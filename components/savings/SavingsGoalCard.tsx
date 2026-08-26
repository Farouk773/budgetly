"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currencySymbol, formatCents, parseEurosToCents } from "@/backend/money";
import type { ApiError, SavingsGoal } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notifyAnalyticsChanged } from "@/components/dashboard/analytics/analyticsBus";
import { useCurrency } from "@/components/providers/CurrencyProvider";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function SavingsGoalCard({ goal }: { goal: SavingsGoal }) {
  const router = useRouter();
  const currency = useCurrency();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
      notifyAnalyticsChanged();
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
      notifyAnalyticsChanged();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <li className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{goal.name}</p>
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isSubmitting}
          className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          Supprimer
        </button>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className="bg-brand-gradient h-full rounded-full transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {formatCents(goal.currentCents, currency)} / {formatCents(goal.targetCents, currency)} (
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
          placeholder={`Ajouter un montant (${currencySymbol(currency)})`}
          className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
        <Button type="submit" size="sm" disabled={isSubmitting}>
          Ajouter
        </Button>
        {amount.trim() !== "" && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAmount("")}
          >
            Annuler
          </Button>
        )}
      </form>
      {error && (
        <p className="animate-fade-in mt-1 text-xs text-amber-800 dark:text-amber-400">{error}</p>
      )}

      <ConfirmDialog
        open={isConfirmingDelete}
        title="Supprimer cet objectif ?"
        description="Cette action est définitive et ne peut pas être annulée."
        confirmLabel="Supprimer"
        isSubmitting={isSubmitting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </li>
  );
}
