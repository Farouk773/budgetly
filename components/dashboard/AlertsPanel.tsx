import { formatCents } from "@/lib/money";
import type { AlertsSnapshot } from "@/lib/types";

const DUE_LABEL: Record<AlertsSnapshot["upcomingDues"][number]["type"], string> = {
  fixedCharge: "Charge fixe",
  loan: "Prêt",
};

function formatDueIn(days: number): string {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} jours`;
}

export function AlertsPanel({ snapshot }: { snapshot: AlertsSnapshot }) {
  const hasOverdraftWarning = snapshot.overdraft?.atRisk ?? false;
  const hasUpcomingDues = snapshot.upcomingDues.length > 0;

  if (!hasOverdraftWarning && !hasUpcomingDues) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {hasOverdraftWarning && snapshot.overdraft && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Risque de découvert : il te manque{" "}
          <strong>{formatCents(snapshot.overdraft.shortfallCents)}</strong>{" "}
          pour couvrir tes charges fixes et prêts de ce mois-ci.
        </p>
      )}

      {hasUpcomingDues && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-zinc-700">
            Échéances à venir
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {snapshot.upcomingDues.map((due, index) => (
              <li
                key={`${due.type}-${due.label}-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-600">
                  {due.label}{" "}
                  <span className="text-xs text-zinc-400">
                    ({DUE_LABEL[due.type]})
                  </span>
                </span>
                <span className="text-zinc-900">
                  {formatCents(due.amountCents)} · {formatDueIn(due.daysUntilDue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
