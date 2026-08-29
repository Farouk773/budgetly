"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currencySymbol, parseEurosToCents } from "@/backend/money";
import type { ApiError, Category } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export function NewFixedChargeForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const currency = useCurrency();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError("Le libellé est obligatoire");
      return;
    }

    const amountCents = parseEurosToCents(amount);
    if (amountCents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/fixed-charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          label: label.trim(),
          amountCents: String(amountCents),
          dayOfMonth: Number(dayOfMonth),
        }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      router.push("/fixed-charges");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Catégorie
        </label>
        <Select
          id="category"
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="label" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Libellé
        </label>
        <input
          id="label"
          type="text"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex : Loyer, Internet, Netflix..."
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="dayOfMonth"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Jour de prélèvement dans le mois
        </label>
        <input
          id="dayOfMonth"
          type="number"
          min={1}
          max={31}
          required
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Montant mensuel ({currencySymbol(currency)})
        </label>
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="650,00"
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
        <Button type="button" variant="secondary" onClick={() => router.push("/fixed-charges")}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
