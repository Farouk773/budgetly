"use client";

import { useAnalyticsData } from "@/components/dashboard/analytics/useAnalyticsData";
import { AnalyticsLineChart } from "@/components/dashboard/analytics/AnalyticsLineChart";
import {
  AnalyticsErrorMessage,
  AnalyticsLoading,
} from "@/components/dashboard/analytics/AnalyticsStates";
import type { RevenuAnalyticsResponse } from "@/backend/types";

export function RevenuAnalyticsChart() {
  const { data, isLoading, error } = useAnalyticsData<RevenuAnalyticsResponse>(
    "/api/analytics/revenu?granularite=mois"
  );

  if (isLoading) return <AnalyticsLoading />;
  if (error) return <AnalyticsErrorMessage message={error} />;
  if (!data) return null;

  return (
    <AnalyticsLineChart
      points={data.points}
      granularity={data.meta.granularity}
      color="#65a30d"
      name="Revenu"
    />
  );
}
