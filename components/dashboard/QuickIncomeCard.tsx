"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { formatCents, parseEurosToCents } from "@/lib/money";
import type { ApiError, Income, IncomeType } from "@/lib/types";
import { INCOME_TYPE_LABELS } from "@/lib/types";

export function QuickIncomeCard({
  month,
  incomes,
}: {
  month: string;
  incomes: Income[];
}) {
  const router = useRouter();
  const [type, setType] = useState<IncomeType>("SALARY");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const netAmountCents = parseEurosToCents(amount);
    if (netAmountCents === null) {
      setError("Montant invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("type", type);
      if (label.trim()) formData.set("label", label.trim());
      formData.set("netAmountCents", String(netAmountCents));
      formData.set("periodMonth", `${month}-01`);

      const res = await fetch("/api/incomes", { method: "POST", body: formData });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      setAmount("");
      setLabel("");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <p className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-700">
        <Wallet className="h-4 w-4 text-teal-600" />
        Revenus de ce mois
      </p>

      {incomes.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          Aucun revenu enregistré pour ce mois pour l&apos;instant.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-slate-100 text-sm">
          {incomes.map((income) => (
            <li key={income.id} className="flex justify-between py-1.5">
              <span className="text-slate-600">
                {income.label || INCOME_TYPE_LABELS[income.type]}
              </span>
              <span className="font-medium text-slate-900">
                {formatCents(income.netAmountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as IncomeType)}
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {Object.entries(INCOME_TYPE_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant (€)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (optionnel)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
        >
          {isSubmitting ? "Ajout..." : "Ajouter ce revenu"}
        </button>
        {error && <p className="text-xs text-amber-800">{error}</p>}
      </form>
    </div>
  );
}
