import { AlertTriangle, CalendarClock } from "lucide-react";
import { formatCents } from "@/backend/money";
import type { AlertsSnapshot, Currency } from "@/backend/types";

const DUE_LABEL: Record<AlertsSnapshot["upcomingDues"][number]["type"], string> = {
  fixedCharge: "Charge fixe",
  loan: "Prêt",
};

function formatDueIn(days: number): string {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} jours`;
}

export function AlertsPanel({
  snapshot,
  currency,
}: {
  snapshot: AlertsSnapshot;
  currency?: Currency;
}) {
  const hasOverdraftWarning = snapshot.overdraft?.atRisk ?? false;
  const hasUpcomingDues = snapshot.upcomingDues.length > 0;

  if (!hasOverdraftWarning && !hasUpcomingDues) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {hasOverdraftWarning && snapshot.overdraft && (
        <p className="animate-fade-in flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Risque de découvert : il te manque{" "}
            <strong>{formatCents(snapshot.overdraft.shortfallCents, currency)}</strong>{" "}
            pour couvrir tes charges fixes et prêts de ce mois-ci.
          </span>
        </p>
      )}

      {hasUpcomingDues && (
        <div className="card-surface p-5">
          <p className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">
            <CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Échéances à venir
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-slate-100 text-sm dark:divide-white/10">
            {snapshot.upcomingDues.map((due, index) => (
              <li
                key={`${due.type}-${due.label}-${index}`}
                className="flex items-center justify-between py-2"
              >
                <span className="text-slate-600 dark:text-slate-400">
                  {due.label}{" "}
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    ({DUE_LABEL[due.type]})
                  </span>
                </span>
                <span className="text-slate-900 dark:text-slate-100">
                  {formatCents(due.amountCents, currency)} · {formatDueIn(due.daysUntilDue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
