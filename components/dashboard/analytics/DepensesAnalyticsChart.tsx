"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/components/dashboard/analytics/useAnalyticsData";
import { AnalyticsTabs } from "@/components/dashboard/analytics/AnalyticsTabs";
import { AnalyticsLineChart } from "@/components/dashboard/analytics/AnalyticsLineChart";
import { AnalyticsHeadline } from "@/components/dashboard/analytics/AnalyticsHeadline";
import {
  AnalyticsErrorMessage,
  AnalyticsLoading,
} from "@/components/dashboard/analytics/AnalyticsStates";
import type { DepensesAnalyticsResponse } from "@/backend/types";

const COLOR = "#2563eb";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AnalyticsTabs options={VIEW_OPTIONS} active={view} onChange={setView} size="sm" />
      </div>

      <div className="mt-4">
        {isLoading && <AnalyticsLoading />}
        {!isLoading && error && <AnalyticsErrorMessage message={error} />}
        {!isLoading && !error && data && (
          <>
            {view === "mois" && (
              <div className="mb-4">
                <AnalyticsHeadline
                  points={data.points}
                  color={COLOR}
                  label="Dépenses ce mois-ci"
                  higherIsBetter={false}
                />
              </div>
            )}
            <AnalyticsLineChart
              points={data.points}
              granularity={data.meta.granularity}
              color={COLOR}
              name="Dépenses"
            />
          </>
        )}
      </div>
    </div>
  );
}
