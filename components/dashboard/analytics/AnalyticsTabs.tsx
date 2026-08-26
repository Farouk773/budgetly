"use client";

/** Neutral, discreet tab/segmented-control style shared by the curve
 * selector, the "jour"/"mois" toggle and the loan selector — deliberately
 * NOT the primary brand-gradient Button variant (reserved for the one main
 * CTA per screen, see DESIGN_SYSTEM.md): active state is a soft indigo tint,
 * not a filled gradient. */
export function AnalyticsTabs<T extends string>({
  options,
  active,
  onChange,
  size = "md",
}: {
  options: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={active === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-lg font-medium transition-colors ${sizeClasses} ${
            active === option.id
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
