"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { DotItemDotProps } from "recharts";
import { formatCents } from "@/backend/money";
import type { AnalyticsGranularity, AnalyticsPoint, Currency } from "@/backend/types";
import { useCurrency } from "@/components/providers/CurrencyProvider";

// Muted, theme-agnostic gray: Recharts renders axis ticks as inline-styled
// SVG <text>, which Tailwind's dark: media-query classes can't reliably
// override, so a single neutral tone is used that reads fine on both the
// light and dark --surface backgrounds (see globals.css).
const AXIS_TICK_COLOR = "#94a3b8";
const GRID_STROKE = "rgba(148, 163, 184, 0.18)";

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

function ChartTooltip({
  active,
  payload,
  label,
  granularity,
  name,
  color,
  currency,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  granularity: AnalyticsGranularity;
  name: string;
  color: string;
  currency: Currency;
}) {
  if (!active || !payload || !payload.length || typeof label !== "string") return null;
  return (
    <div
      className="rounded-xl border px-3 py-2 shadow-lg"
      style={{ background: "var(--surface)", borderColor: "var(--surface-border)" }}
    >
      <p className="text-[11px] font-medium" style={{ color: AXIS_TICK_COLOR }}>
        {formatTooltipLabel(label, granularity)}
      </p>
      <p
        className="mt-0.5 flex items-center gap-1.5 font-heading text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        {formatCents(payload[0].value, currency)}
        <span className="font-sans text-xs font-normal" style={{ color: AXIS_TICK_COLOR }}>
          {name}
        </span>
      </p>
    </div>
  );
}

function makeEndpointDot(color: string, lastIndex: number, showAllDots: boolean) {
  return function EndpointDot(props: DotItemDotProps) {
    const { cx, cy, index } = props;
    if (typeof cx !== "number" || typeof cy !== "number") return <g />;
    if (index !== lastIndex) {
      return showAllDots ? (
        <circle cx={cx} cy={cy} r={2.5} fill={color} stroke="var(--surface)" strokeWidth={1.5} />
      ) : (
        <g />
      );
    }
    return (
      <g>
        <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.16} />
        <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
      </g>
    );
  };
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
  const gradientId = `analytics-gradient-${useId().replace(/[:]/g, "")}`;
  const lastIndex = points.length - 1;
  const currency = useCurrency();

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatAxisTick(value, granularity)}
            tick={{ fontSize: 11, fill: AXIS_TICK_COLOR }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            tickFormatter={(value: number) => formatCents(value, currency)}
            tick={{ fontSize: 11, fill: AXIS_TICK_COLOR }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            content={
              <ChartTooltip
                granularity={granularity}
                name={name}
                color={color}
                currency={currency}
              />
            }
            cursor={{ stroke: color, strokeOpacity: 0.25, strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="valueCents"
            name={name}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={makeEndpointDot(color, lastIndex, points.length <= 14)}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
