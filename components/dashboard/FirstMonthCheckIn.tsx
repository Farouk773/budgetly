import { formatCents } from "@/backend/money";
import type { Currency } from "@/backend/types";

/** One-time check-in shown after a user's first calendar month has ended,
 * as long as they've never corrected their balance (User.balanceCents still
 * null). Anyone who signs up mid-month starts from an implicit 0 anchor —
 * if they'd already spent part of that month's income before opening the
 * app, the calculated balance silently overstates reality, and that error
 * then carries into every following month (the running balance is
 * cumulative by design). This nudges them to reconcile once, with a
 * concrete number to compare against their real account, instead of a
 * blind question at signup before they've entered anything. Disappears on
 * its own once the balance is corrected (isDeclared becomes true) — no
 * dismiss button, since closing it without correcting would leave the
 * underlying number just as wrong. */
export function FirstMonthCheckIn({
  monthLabel,
  balanceCents,
  currency,
}: {
  monthLabel: string;
  balanceCents: number;
  currency?: Currency;
}) {
  return (
    <div className="card-surface flex items-start gap-3 border-l-4 border-l-indigo-500 p-5 dark:border-l-indigo-400">
      <div>
        <p className="font-heading text-sm font-semibold text-slate-800 dark:text-slate-100">
          Ton premier mois ({monthLabel}) est terminé
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          D&apos;après ce que tu as enregistré, il te restait{" "}
          <strong>{formatCents(balanceCents, currency)}</strong> à la fin. Comme
          tu as commencé en cours de mois, ce calcul part d&apos;un solde de
          départ à 0 par défaut — vérifie que ça correspond bien à la réalité
          de ton compte, et corrige-le si besoin.
        </p>
        <a
          href="/dashboard?correct=1#balance-card"
          className="mt-3 inline-block text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Corriger mon solde →
        </a>
      </div>
    </div>
  );
}
