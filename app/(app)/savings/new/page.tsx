"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEurosToCents } from "@/backend/money";
import type { ApiError } from "@/backend/types";
import { Button } from "@/components/ui/Button";

export default function NewSavingsGoalPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const targetCents = parseEurosToCents(target);
    if (targetCents === null) {
      setError("Montant objectif invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/savings-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetCents: String(targetCents),
          targetDate: targetDate || undefined,
        }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      router.push("/savings");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">Nouvel objectif</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Nom de l&apos;objectif
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Vacances, Fonds d'urgence..."
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="target" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Montant à atteindre (€)
          </label>
          <input
            id="target"
            type="text"
            inputMode="decimal"
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="2000,00"
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="targetDate"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Date cible (optionnel)
          </label>
          <input
            id="targetDate"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
          />
        </div>

        {error && (
          <p className="animate-fade-in rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Création..." : "Créer l'objectif"}
        </Button>
      </form>
    </div>
  );
}
