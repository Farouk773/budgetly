"use client";

import { useAnalyticsData } from "@/components/dashboard/analytics/useAnalyticsData";
import { AnalyticsLineChart } from "@/components/dashboard/analytics/AnalyticsLineChart";
import { AnalyticsHeadline } from "@/components/dashboard/analytics/AnalyticsHeadline";
import {
  AnalyticsErrorMessage,
  AnalyticsLoading,
} from "@/components/dashboard/analytics/AnalyticsStates";
import type { RevenuAnalyticsResponse } from "@/backend/types";

const COLOR = "#059669";

export function RevenuAnalyticsChart() {
  const { data, isLoading, error } = useAnalyticsData<RevenuAnalyticsResponse>(
    "/api/analytics/revenu?granularite=mois"
  );

  if (isLoading) return <AnalyticsLoading />;
  if (error) return <AnalyticsErrorMessage message={error} />;
  if (!data) return null;

  return (
    <div>
      <div className="mb-4">
        <AnalyticsHeadline
          points={data.points}
          color={COLOR}
          label="Revenu net ce mois-ci"
          higherIsBetter
        />
      </div>
      <AnalyticsLineChart
        points={data.points}
        granularity={data.meta.granularity}
        color={COLOR}
        name="Revenu"
      />
    </div>
  );
}
