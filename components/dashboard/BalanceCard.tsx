"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Wallet } from "lucide-react";
import { currencySymbol, formatCents, parseSignedEurosToCents } from "@/backend/money";
import type { ApiError, BalanceSource } from "@/backend/types";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/components/providers/CurrencyProvider";

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
  const currency = useCurrency();
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
        className="card-elevated flex animate-scale-in flex-col gap-2 p-5"
      >
        <label htmlFor="balance" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Corriger le solde total ({currencySymbol(currency)})
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500">
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
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
        />

        <label htmlFor="source" className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Ce montant, c&apos;est...
        </label>
        <select
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value as BalanceSource)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:bg-[#131a2e] dark:focus:ring-indigo-500/20"
        >
          <option value="BANK">Un compte bancaire</option>
          <option value="CASH">Du cash</option>
          <option value="MIXED">Les deux combinés</option>
        </select>

        {error && (
          <p className="animate-fade-in text-sm text-amber-800 dark:text-amber-400">{error}</p>
        )}
        <div className="mt-1 flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "..." : "Enregistrer"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsEditing(false)}
            className="flex-1"
          >
            Annuler
          </Button>
        </div>
      </form>
    );
  }

  const sourceInfo = balanceSource ? SOURCE_LABELS[balanceSource] : null;

  return (
    <div className="card-elevated flex items-center justify-between p-5">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Solde de départ</p>
          {sourceInfo && (
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
              <sourceInfo.Icon className="h-3 w-3" />
              {sourceInfo.label}
            </span>
          )}
        </div>
        <p className="text-brand-gradient text-lg font-semibold">
          {formatCents(displayedCents, currency)}
        </p>
        {!isDeclared && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Calculé à partir de tes revenus et dépenses enregistrés — précise
            si c&apos;est un compte bancaire ou du cash en corrigeant
          </p>
        )}
        {isDeclared && isExactAnchor && balanceAsOf && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Corrigé le {DATE_FORMATTER.format(new Date(balanceAsOf))}
          </p>
        )}
        {isDeclared && !isExactAnchor && balanceAsOf && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Calculé depuis ta dernière correction du{" "}
            {DATE_FORMATTER.format(new Date(balanceAsOf))}
          </p>
        )}
      </div>
      {canEdit && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          Corriger
        </Button>
      )}
    </div>
  );
}
