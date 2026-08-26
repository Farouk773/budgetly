"use client";

import { useAnalyticsData } from "@/components/dashboard/analytics/useAnalyticsData";
import { AnalyticsLineChart } from "@/components/dashboard/analytics/AnalyticsLineChart";
import {
  AnalyticsErrorMessage,
  AnalyticsLoading,
  EstimatedCaveat,
} from "@/components/dashboard/analytics/AnalyticsStates";
import type { ChargesAnalyticsResponse } from "@/backend/types";

export function ChargesAnalyticsChart() {
  const { data, isLoading, error } = useAnalyticsData<ChargesAnalyticsResponse>(
    "/api/analytics/charges?granularite=mois"
  );

  if (isLoading) return <AnalyticsLoading />;
  if (error) return <AnalyticsErrorMessage message={error} />;
  if (!data) return null;

  return (
    <div>
      {data.meta.estimated && data.meta.caveat && (
        <EstimatedCaveat caveat={data.meta.caveat} />
      )}
      <AnalyticsLineChart
        points={data.points}
        granularity={data.meta.granularity}
        color="#d97706"
        name="Charges fixes"
      />
    </div>
  );
}
