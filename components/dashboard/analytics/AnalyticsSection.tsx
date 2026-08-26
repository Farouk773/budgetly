"use client";

import { useState } from "react";
import { AnalyticsTabs } from "@/components/dashboard/analytics/AnalyticsTabs";
import { DepensesAnalyticsChart } from "@/components/dashboard/analytics/DepensesAnalyticsChart";
import { RevenuAnalyticsChart } from "@/components/dashboard/analytics/RevenuAnalyticsChart";
import { EpargneAnalyticsChart } from "@/components/dashboard/analytics/EpargneAnalyticsChart";
import { PretAnalyticsChart } from "@/components/dashboard/analytics/PretAnalyticsChart";
import { ChargesAnalyticsChart } from "@/components/dashboard/analytics/ChargesAnalyticsChart";

type AnalyticsTab = "depenses" | "revenu" | "epargne" | "pret" | "charges";

const CURVE_OPTIONS: { id: AnalyticsTab; label: string }[] = [
  { id: "depenses", label: "Dépenses" },
  { id: "revenu", label: "Revenu" },
  { id: "epargne", label: "Épargne" },
  { id: "pret", label: "Prêt(s)" },
  { id: "charges", label: "Charges fixes" },
];

/** Client-fetched "Analyses" section of the dashboard: a curve selector plus
 * one dedicated chart component per curve type, each fetching its own data
 * from GET /api/analytics/[type] (same fetch + useState pattern used by
 * PurchaseSimulator/LoanCard elsewhere in the app). */
export function AnalyticsSection() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("depenses");

  return (
    <div className="card-surface p-5">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        L&apos;évolution de tes finances dans le temps.
      </p>

      <div className="mt-4">
        <AnalyticsTabs options={CURVE_OPTIONS} active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mt-5">
        {activeTab === "depenses" && <DepensesAnalyticsChart />}
        {activeTab === "revenu" && <RevenuAnalyticsChart />}
        {activeTab === "epargne" && <EpargneAnalyticsChart />}
        {activeTab === "pret" && <PretAnalyticsChart />}
        {activeTab === "charges" && <ChargesAnalyticsChart />}
      </div>
    </div>
  );
}
