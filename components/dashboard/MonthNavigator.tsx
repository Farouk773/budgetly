import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftMonth } from "@/backend/dateUtils";

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

/** Month navigation is bounded on both ends: never into a month that hasn't
 * arrived yet, and never before the account's first month — there is nothing
 * to show there, so it's not "your data", just an empty shell. */
export function MonthNavigator({
  month,
  isCurrentMonth,
  firstMonth,
  currentMonth,
}: {
  month: string;
  isCurrentMonth: boolean;
  firstMonth: string;
  currentMonth: string;
}) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const label = MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00.000Z`));
  const canGoBack = previous >= firstMonth;
  const canGoForward = next <= currentMonth;

  return (
    <div className="flex items-center gap-2">
      {canGoBack ? (
        <Link
          href={`/dashboard?month=${previous}`}
          aria-label="Mois précédent"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-hidden
          title="Avant la création de ton compte"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-300 dark:border-white/5 dark:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      <span className="min-w-[9rem] text-center text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
        {label}
      </span>

      {canGoForward ? (
        <Link
          href={`/dashboard?month=${next}`}
          aria-label="Mois suivant"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-hidden
          title="Ce mois n'est pas encore arrivé"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-300 dark:border-white/5 dark:text-slate-700"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      )}

      {!isCurrentMonth && (
        <Link
          href="/dashboard"
          className="ml-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Revenir à ce mois-ci
        </Link>
      )}
    </div>
  );
}
