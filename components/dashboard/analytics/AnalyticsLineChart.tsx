"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents } from "@/backend/money";
import type { AnalyticsGranularity, AnalyticsPoint } from "@/backend/types";

// Muted, theme-agnostic gray: Recharts renders axis ticks as inline-styled
// SVG <text>, which Tailwind's dark: media-query classes can't reliably
// override, so a single neutral tone is used that reads fine on both the
// light and dark --surface backgrounds (see globals.css).
const AXIS_TICK_COLOR = "#94a3b8";
const GRID_STROKE = "rgba(148, 163, 184, 0.25)";

const MONTH_TICK_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "2-digit",
});
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});
const DAY_TICK_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "numeric" });
const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

function formatAxisTick(date: string, granularity: AnalyticsGranularity): string {
  return granularity === "jour"
    ? DAY_TICK_FORMATTER.format(new Date(`${date}T00:00:00.000Z`))
    : MONTH_TICK_FORMATTER.format(new Date(`${date}-01T00:00:00.000Z`));
}

function formatTooltipLabel(date: string, granularity: AnalyticsGranularity): string {
  return granularity === "jour"
    ? DAY_LABEL_FORMATTER.format(new Date(`${date}T00:00:00.000Z`))
    : MONTH_LABEL_FORMATTER.format(new Date(`${date}-01T00:00:00.000Z`));
}

export function AnalyticsLineChart({
  points,
  granularity,
  color = "#4f46e5",
  name,
}: {
  points: AnalyticsPoint[];
  granularity: AnalyticsGranularity;
  color?: string;
  name: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatAxisTick(value, granularity)}
            tick={{ fontSize: 11, fill: AXIS_TICK_COLOR }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => formatCents(value)}
            tick={{ fontSize: 11, fill: AXIS_TICK_COLOR }}
            axisLine={false}
            tickLine={false}
            width={76}
          />
          <Tooltip
            formatter={(value) => [formatCents(Number(value)), name]}
            labelFormatter={(label) =>
              typeof label === "string" ? formatTooltipLabel(label, granularity) : label
            }
            contentStyle={{
              backgroundColor: "var(--surface)",
              color: "var(--foreground)",
              border: "1px solid var(--surface-border)",
              borderRadius: "0.75rem",
              fontSize: "13px",
            }}
            labelStyle={{ color: AXIS_TICK_COLOR, marginBottom: 4 }}
          />
          <Line
            type="monotone"
            dataKey="valueCents"
            name={name}
            stroke={color}
            strokeWidth={2}
            dot={points.length <= 14}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
