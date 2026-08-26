"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/components/dashboard/analytics/useAnalyticsData";
import { AnalyticsTabs } from "@/components/dashboard/analytics/AnalyticsTabs";
import { AnalyticsLineChart } from "@/components/dashboard/analytics/AnalyticsLineChart";
import {
  AnalyticsErrorMessage,
  AnalyticsLoading,
} from "@/components/dashboard/analytics/AnalyticsStates";
import type { DepensesAnalyticsResponse } from "@/backend/types";

const VIEW_OPTIONS: { id: "jour" | "mois"; label: string }[] = [
  { id: "jour", label: "Ce mois-ci, jour par jour" },
  { id: "mois", label: "Historique mensuel" },
];

export function DepensesAnalyticsChart() {
  const [view, setView] = useState<"jour" | "mois">("jour");
  const { data, isLoading, error } = useAnalyticsData<DepensesAnalyticsResponse>(
    `/api/analytics/depenses?granularite=${view}`
  );

  return (
    <div>
      <AnalyticsTabs options={VIEW_OPTIONS} active={view} onChange={setView} size="sm" />

      <div className="mt-4">
        {isLoading && <AnalyticsLoading />}
        {!isLoading && error && <AnalyticsErrorMessage message={error} />}
        {!isLoading && !error && data && (
          <AnalyticsLineChart
            points={data.points}
            granularity={data.meta.granularity}
            color="#2563eb"
            name="Dépenses"
          />
        )}
      </div>
    </div>
  );
}
