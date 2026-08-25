"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCents } from "@/backend/money";
import type { CategoryBreakdownEntry } from "@/backend/queries/spending";

const COLORS = [
  "#7c3aed",
  "#2563eb",
  "#0891b2",
  "#d97706",
  "#db2777",
  "#65a30d",
  "#4f46e5",
  "#64748b",
];

export function CategoryBreakdownChart({
  entries,
}: {
  entries: CategoryBreakdownEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="card-surface p-5">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Répartition par catégorie
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Pas encore de dépenses ce mois-ci.
        </p>
      </div>
    );
  }

  const total = entries.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="card-surface p-5">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Répartition par catégorie
      </p>
      <div className="mt-2 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={entries}
              dataKey="amountCents"
              nameKey="categoryName"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {entries.map((entry, index) => (
                <Cell key={entry.categoryId} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCents(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {entries.map((entry, index) => (
          <li
            key={entry.categoryId}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {entry.categoryName}
            </span>
            <span className="text-slate-900 dark:text-slate-100">
              {formatCents(entry.amountCents)}{" "}
              <span className="text-slate-400 dark:text-slate-500">
                ({Math.round((entry.amountCents / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
