import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCents } from "@/backend/money";
import type { AnalyticsPoint } from "@/backend/types";

/** Latest-value headline shown above a chart, with a trend badge versus the
 * previous point when there's enough history — gives the number at a glance
 * instead of forcing a hover to read the chart. `higherIsBetter` flips which
 * direction reads as "good" (emerald) vs "attention" (amber); e.g. a rising
 * expenses curve is not good news, a rising savings curve is. */
export function AnalyticsHeadline({
  points,
  color,
  label,
  higherIsBetter = false,
}: {
  points: AnalyticsPoint[];
  color: string;
  label: string;
  higherIsBetter?: boolean;
}) {
  const latest = points.at(-1);
  const previous = points.length >= 2 ? points.at(-2) : undefined;
  if (!latest) return null;

  const deltaCents = previous ? latest.valueCents - previous.valueCents : null;
  const isFlat = deltaCents === 0;
  const isUp = deltaCents !== null && deltaCents > 0;
  const isGood = deltaCents === null ? null : isUp === higherIsBetter;

  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p
          className="mt-0.5 font-heading text-3xl font-semibold tracking-tight"
          style={{ color }}
        >
          {formatCents(latest.valueCents)}
        </p>
      </div>
      {deltaCents !== null && !isFlat && (
        <span
          className={`mb-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            isGood
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
          }`}
        >
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {formatCents(Math.abs(deltaCents))}
        </span>
      )}
    </div>
  );
}
