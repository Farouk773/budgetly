"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEurosToCents } from "@/backend/money";
import type { ApiError, Category } from "@/backend/types";

export function NewFixedChargeForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
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
        <label htmlFor="category" className="text-sm font-medium text-slate-700">
          Catégorie
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="label" className="text-sm font-medium text-slate-700">
          Libellé
        </label>
        <input
          id="label"
          type="text"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex : Loyer, Internet, Netflix..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="dayOfMonth"
          className="text-sm font-medium text-slate-700"
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
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium text-slate-700">
          Montant mensuel (€)
        </label>
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="650,00"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
      >
        {isSubmitting ? "Ajout..." : "Ajouter"}
      </button>
    </form>
  );
}
