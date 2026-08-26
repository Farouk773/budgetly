"use client";

import { formatCents } from "@/backend/money";
import { useAnalyticsData } from "@/components/dashboard/analytics/useAnalyticsData";
import { AnalyticsLineChart } from "@/components/dashboard/analytics/AnalyticsLineChart";
import { AnalyticsHeadline } from "@/components/dashboard/analytics/AnalyticsHeadline";
import {
  AnalyticsErrorMessage,
  AnalyticsLoading,
  EstimatedCaveat,
} from "@/components/dashboard/analytics/AnalyticsStates";
import type { EpargneAnalyticsResponse } from "@/backend/types";

const COLOR = "#0891b2";

export function EpargneAnalyticsChart() {
  const { data, isLoading, error } = useAnalyticsData<EpargneAnalyticsResponse>(
    "/api/analytics/epargne?granularite=mois"
  );

  if (isLoading) return <AnalyticsLoading />;
  if (error) return <AnalyticsErrorMessage message={error} />;
  if (!data) return null;

  return (
    <div>
      <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Épargne cumulée à ce jour
        </p>
        <p className="mt-0.5 font-heading text-2xl font-semibold text-emerald-800 dark:text-emerald-200">
          {formatCents(data.totalSavedCents)}
        </p>
      </div>

      {data.meta.estimated && data.meta.caveat && (
        <EstimatedCaveat caveat={data.meta.caveat} />
      )}

      <div className="mb-4">
        <AnalyticsHeadline
          points={data.points}
          color={COLOR}
          label="Versé ce mois-ci"
          higherIsBetter
        />
      </div>

      <AnalyticsLineChart
        points={data.points}
        granularity={data.meta.granularity}
        color={COLOR}
        name="Épargne versée"
      />
    </div>
  );
}
