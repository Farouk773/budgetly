"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCents } from "@/lib/money";
import type { CategoryBreakdownEntry } from "@/lib/queries/spending";

const COLORS = [
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#d97706",
  "#db2777",
  "#65a30d",
  "#0891b2",
  "#64748b",
];

export function CategoryBreakdownChart({
  entries,
}: {
  entries: CategoryBreakdownEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-zinc-700">
          Répartition par catégorie
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Pas encore de dépenses ce mois-ci.
        </p>
      </div>
    );
  }

  const total = entries.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-700">
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
            <span className="flex items-center gap-2 text-zinc-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {entry.categoryName}
            </span>
            <span className="text-zinc-900">
              {formatCents(entry.amountCents)}{" "}
              <span className="text-zinc-400">
                ({Math.round((entry.amountCents / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
