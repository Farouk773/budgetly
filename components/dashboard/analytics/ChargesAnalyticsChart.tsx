"use client";

import { useAnalyticsData } from "@/components/dashboard/analytics/useAnalyticsData";
import { AnalyticsLineChart } from "@/components/dashboard/analytics/AnalyticsLineChart";
import { AnalyticsHeadline } from "@/components/dashboard/analytics/AnalyticsHeadline";
import {
  AnalyticsErrorMessage,
  AnalyticsLoading,
  EstimatedCaveat,
} from "@/components/dashboard/analytics/AnalyticsStates";
import type { ChargesAnalyticsResponse } from "@/backend/types";

const COLOR = "#d97706";

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
      <div className="mb-4">
        <AnalyticsHeadline
          points={data.points}
          color={COLOR}
          label="Charges fixes ce mois-ci"
          higherIsBetter={false}
        />
      </div>
      <AnalyticsLineChart
        points={data.points}
        granularity={data.meta.granularity}
        color={COLOR}
        name="Charges fixes"
      />
    </div>
  );
}
