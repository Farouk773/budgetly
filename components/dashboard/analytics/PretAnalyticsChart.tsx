"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/components/dashboard/analytics/useAnalyticsData";
import { AnalyticsTabs } from "@/components/dashboard/analytics/AnalyticsTabs";
import { AnalyticsLineChart } from "@/components/dashboard/analytics/AnalyticsLineChart";
import {
  AnalyticsEmptyState,
  AnalyticsErrorMessage,
  AnalyticsLoading,
  EstimatedCaveat,
} from "@/components/dashboard/analytics/AnalyticsStates";
import type { PretAnalyticsResponse } from "@/backend/types";

export function PretAnalyticsChart() {
  // undefined = "let the backend pick the default loan" (first fetch has no
  // loanId query param); once the response comes back we pin selectedLoanId
  // so switching loans re-fetches the right series.
  const [selectedLoanId, setSelectedLoanId] = useState<string | undefined>(undefined);
  const query = selectedLoanId ? `&loanId=${encodeURIComponent(selectedLoanId)}` : "";
  const { data, isLoading, error } = useAnalyticsData<PretAnalyticsResponse>(
    `/api/analytics/pret?granularite=mois${query}`
  );

  if (isLoading) return <AnalyticsLoading />;
  if (error) return <AnalyticsErrorMessage message={error} />;
  if (!data) return null;

  if (data.loans.length === 0 || !data.selectedLoanId) {
    return (
      <AnalyticsEmptyState
        message="Tu n'as pas encore de prêt enregistré."
        linkHref="/loans/new"
        linkLabel="Ajouter un prêt"
      />
    );
  }

  return (
    <div>
      {data.loans.length > 1 && (
        <div className="mb-4">
          <AnalyticsTabs
            options={data.loans.map((loan) => ({ id: loan.id, label: loan.name }))}
            active={data.selectedLoanId}
            onChange={setSelectedLoanId}
            size="sm"
          />
        </div>
      )}

      {data.meta.estimated && data.meta.caveat && (
        <EstimatedCaveat caveat={data.meta.caveat} />
      )}

      <AnalyticsLineChart
        points={data.points}
        granularity={data.meta.granularity}
        color="#7c3aed"
        name="Restant dû"
      />
    </div>
  );
}
