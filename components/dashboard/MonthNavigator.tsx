import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftMonth } from "@/backend/dateUtils";

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

export function MonthNavigator({
  month,
  isCurrentMonth,
}: {
  month: string;
  isCurrentMonth: boolean;
}) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const label = MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00.000Z`));

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/dashboard?month=${previous}`}
        aria-label="Mois précédent"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      <span className="min-w-[9rem] text-center text-sm font-medium capitalize text-slate-700">
        {label}
      </span>

      <Link
        href={`/dashboard?month=${next}`}
        aria-label="Mois suivant"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>

      {!isCurrentMonth && (
        <Link
          href="/dashboard"
          className="ml-1 text-xs font-medium text-teal-700 hover:text-teal-800"
        >
          Revenir à ce mois-ci
        </Link>
      )}
    </div>
  );
}
