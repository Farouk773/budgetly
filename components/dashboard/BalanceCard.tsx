"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Wallet } from "lucide-react";
import { formatCents, parseSignedEurosToCents } from "@/lib/money";
import type { ApiError, BalanceSource } from "@/lib/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const SOURCE_LABELS: Record<BalanceSource, { label: string; Icon: typeof Landmark }> = {
  BANK: { label: "Compte bancaire", Icon: Landmark },
  CASH: { label: "Cash", Icon: Wallet },
  MIXED: { label: "Compte + cash", Icon: Landmark },
};

export function BalanceCard({
  displayedCents,
  balanceAsOf,
  balanceSource,
  isDeclared,
  isExactAnchor,
  canEdit,
}: {
  displayedCents: number;
  balanceAsOf: string | null;
  balanceSource: BalanceSource | null;
  isDeclared: boolean;
  isExactAnchor: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(
    (displayedCents / 100).toFixed(2).replace(".", ",")
  );
  const [source, setSource] = useState<BalanceSource>(balanceSource ?? "BANK");
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
        body: JSON.stringify({ balanceCents: String(cents), balanceSource: source }),
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
          Corriger le solde total (€)
        </label>
        <p className="text-xs text-slate-400">
          Utile si le montant réel sur tes comptes/cash diffère de
          l&apos;estimation ci-dessous (dépense en cash non enregistrée,
          etc.).
        </p>
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

        <label htmlFor="source" className="mt-1 text-sm font-medium text-slate-700">
          Ce montant, c&apos;est...
        </label>
        <select
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value as BalanceSource)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        >
          <option value="BANK">Un compte bancaire</option>
          <option value="CASH">Du cash</option>
          <option value="MIXED">Les deux combinés</option>
        </select>

        {error && <p className="text-sm text-amber-800">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            Annuler
          </button>
        </div>
      </form>
    );
  }

  const sourceInfo = balanceSource ? SOURCE_LABELS[balanceSource] : null;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-slate-500">Solde de départ</p>
          {sourceInfo && (
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              <sourceInfo.Icon className="h-3 w-3" />
              {sourceInfo.label}
            </span>
          )}
        </div>
        <p className="text-lg font-semibold text-slate-900">
          {formatCents(displayedCents)}
        </p>
        {!isDeclared && (
          <p className="text-xs text-slate-400">
            Calculé à partir de tes revenus et dépenses enregistrés — précise
            si c&apos;est un compte bancaire ou du cash en corrigeant
          </p>
        )}
        {isDeclared && isExactAnchor && balanceAsOf && (
          <p className="text-xs text-slate-400">
            Corrigé le {DATE_FORMATTER.format(new Date(balanceAsOf))}
          </p>
        )}
        {isDeclared && !isExactAnchor && balanceAsOf && (
          <p className="text-xs text-slate-400">
            Calculé depuis ta dernière correction du{" "}
            {DATE_FORMATTER.format(new Date(balanceAsOf))}
          </p>
        )}
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Corriger
        </button>
      )}
    </div>
  );
}
