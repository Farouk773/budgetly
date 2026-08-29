"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { currencySymbol, formatCents, parseEurosToCents } from "@/backend/money";
import type { ApiError, Category, Expense } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export function EditExpenseForm({
  expense,
  categories,
}: {
  expense: Expense;
  categories: Category[];
}) {
  const router = useRouter();
  const currency = useCurrency();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [label, setLabel] = useState(expense.label ?? "");
  const [date, setDate] = useState(expense.date.slice(0, 10));
  const [amount, setAmount] = useState(
    (expense.amountCents / 100).toFixed(2).replace(".", ",")
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountCents = parseEurosToCents(amount);
    if (amountCents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          label: label.trim() || undefined,
          amountCents: String(amountCents),
          date,
        }),
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      router.push("/expenses");
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
      await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      router.push("/expenses");
      router.refresh();
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
          Libellé (optionnel)
        </label>
        <input
          id="label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex : Carrefour, restaurant..."
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="date" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Date
        </label>
        <input
          id="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Montant ({currencySymbol(currency)})
        </label>
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="45,90"
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Montant actuellement enregistré : {formatCents(expense.amountCents, currency)}
      </p>

      {error && (
        <p className="animate-fade-in rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {error}
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/expenses")}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isSubmitting}
        >
          Supprimer
        </Button>
      </div>

      <ConfirmDialog
        open={isConfirmingDelete}
        title="Supprimer cette dépense ?"
        description="Cette action est définitive et ne peut pas être annulée."
        confirmLabel="Supprimer"
        isSubmitting={isSubmitting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </form>
  );
}
