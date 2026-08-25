"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEurosToCents } from "@/backend/money";
import type { ApiError, IncomeType } from "@/backend/types";
import { INCOME_TYPE_LABELS } from "@/backend/types";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function NewIncomePage() {
  const router = useRouter();
  const [type, setType] = useState<IncomeType>("SALARY");
  const [label, setLabel] = useState("");
  const [month, setMonth] = useState(currentMonthValue());
  const [netAmount, setNetAmount] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [payslip, setPayslip] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const netAmountCents = parseEurosToCents(netAmount);
    if (netAmountCents === null) {
      setError("Montant net invalide");
      return;
    }

    const grossAmountCents =
      grossAmount.trim() === "" ? null : parseEurosToCents(grossAmount);
    if (grossAmount.trim() !== "" && grossAmountCents === null) {
      setError("Montant brut invalide");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("type", type);
      if (label.trim()) formData.set("label", label.trim());
      formData.set("netAmountCents", String(netAmountCents));
      if (grossAmountCents !== null) {
        formData.set("grossAmountCents", String(grossAmountCents));
      }
      formData.set("periodMonth", `${month}-01`);
      if (payslip) formData.set("payslip", payslip);

      const res = await fetch("/api/incomes", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      router.push("/incomes");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900">
        Ajouter un revenu
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium text-slate-700">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as IncomeType)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {Object.entries(INCOME_TYPE_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="label" className="text-sm font-medium text-slate-700">
            Libellé (optionnel)
          </label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex : employeur, client..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="month" className="text-sm font-medium text-slate-700">
            Mois concerné
          </label>
          <input
            id="month"
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="netAmount"
            className="text-sm font-medium text-slate-700"
          >
            Montant net perçu (€)
          </label>
          <input
            id="netAmount"
            type="text"
            inputMode="decimal"
            required
            value={netAmount}
            onChange={(e) => setNetAmount(e.target.value)}
            placeholder="1500,00"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="grossAmount"
            className="text-sm font-medium text-slate-700"
          >
            Montant brut (optionnel)
          </label>
          <input
            id="grossAmount"
            type="text"
            inputMode="decimal"
            value={grossAmount}
            onChange={(e) => setGrossAmount(e.target.value)}
            placeholder="2000,00"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="payslip"
            className="text-sm font-medium text-slate-700"
          >
            Fiche de paie (optionnel)
          </label>
          <input
            id="payslip"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setPayslip(e.target.files?.[0] ?? null)}
            className="text-sm text-slate-600"
          />
          <span className="text-xs text-slate-400">
            PDF ou image, 10 Mo maximum. L&apos;extraction automatique arrive
            dans une prochaine phase — renseigne les montants toi-même pour
            l&apos;instant.
          </span>
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
    </div>
  );
}
