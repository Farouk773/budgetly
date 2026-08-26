/** Small shared building blocks for the analytics charts: a loading
 * placeholder, an error message, an "estimated data" banner, and an empty
 * state — kept in one file since each is a one-liner, reused by every
 * chart component under components/dashboard/analytics/. */

export function AnalyticsLoading() {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
      Chargement des données…
    </div>
  );
}

export function AnalyticsErrorMessage({ message }: { message: string }) {
  return (
    <p className="animate-fade-in rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
      {message}
    </p>
  );
}

/** Discreet banner for series that are best-effort reconstructions
 * (meta.estimated = true) rather than a real recorded history — informative,
 * not alarming, so no amber/warning color here. */
export function EstimatedCaveat({ caveat }: { caveat: string }) {
  return (
    <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
      {caveat}
    </p>
  );
}

export function AnalyticsEmptyState({
  message,
  linkHref,
  linkLabel,
}: {
  message: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {linkHref && linkLabel && (
        <a
          href={linkHref}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
        >
          {linkLabel} →
        </a>
      )}
    </div>
  );
}
