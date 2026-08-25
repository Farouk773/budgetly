import { getCurrentUser } from "@/backend/auth";
import { formatCents } from "@/backend/money";
import {
  currentMonthValue,
  getMonthlyBudget,
  getRunningBalance,
  monthRange,
} from "@/backend/queries/balance";
import { getSpendingByCategory } from "@/backend/queries/spending";
import { getMotivationSnapshot } from "@/backend/queries/motivation";
import { getAlertsSnapshot } from "@/backend/queries/alerts";
import { toIncomeDto } from "@/backend/serializers/income";
import { projectEndOfMonthCents } from "@/backend/finance";
import { prisma } from "@/backend/prisma";
import { FileSpreadsheet, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { PurchaseSimulator } from "@/components/dashboard/PurchaseSimulator";
import { CategoryBreakdownChart } from "@/components/dashboard/CategoryBreakdownChart";
import { MotivationCard } from "@/components/dashboard/MotivationCard";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { QuickIncomeCard } from "@/components/dashboard/QuickIncomeCard";

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

function heroLabel(month: string, currentMonth: string): string {
  if (month === currentMonth) return "Ce qu'il te reste à la fin de ce mois-ci";
  if (month < currentMonth) return "Ce qu'il te restait à la fin de ce mois-là";
  return "Ce qu'il te resterait à la fin de ce mois-là";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  const { month: monthParam } = await searchParams;
  const currentMonth = currentMonthValue();
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth;
  const isCurrentMonth = month === currentMonth;

  const [budget, running, spendingByCategory, motivation, alerts, monthIncomes] =
    user
      ? await Promise.all([
          getMonthlyBudget(user.id, month),
          getRunningBalance(user.id, month),
          getSpendingByCategory(user.id, month),
          isCurrentMonth ? getMotivationSnapshot(user.id) : Promise.resolve(null),
          isCurrentMonth ? getAlertsSnapshot(user.id) : Promise.resolve(null),
          prisma.income.findMany({
            where: { userId: user.id, periodMonth: monthRange(month) },
            orderBy: { createdAt: "asc" },
          }),
        ])
      : [null, null, [], null, null, []];

  const isMonthPositive = (budget?.availableCents ?? 0) >= 0;
  const projectedCents =
    budget && running
      ? projectEndOfMonthCents({
          balanceCents: running.startingBalanceCents,
          monthlyAvailableCents: budget.availableCents,
        })
      : 0;
  const isProjectedPositive = projectedCents >= 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Bienvenue{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Voici où en est ton budget en {MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00.000Z`))}.
          </p>
        </div>
        <MonthNavigator month={month} isCurrentMonth={isCurrentMonth} />
      </div>

      <div
        className={`relative mt-6 overflow-hidden rounded-3xl p-7 text-center shadow-lg sm:p-8 ${
          isProjectedPositive
            ? "bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-900/10"
            : "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-900/10"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 85% 15%, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <p className="relative text-sm font-medium text-white/85">
          {heroLabel(month, currentMonth)}
        </p>
        <p className="relative mt-2 font-heading text-5xl font-bold tracking-tight text-white">
          {formatCents(projectedCents)}
        </p>
        {budget && running && (
          <p className="relative mt-3 flex items-center justify-center gap-1.5 text-sm text-white/90">
            {formatCents(running.startingBalanceCents)} au départ
            {isMonthPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {isMonthPositive ? "+" : ""}
            {formatCents(budget.availableCents)} ce mois-{isCurrentMonth ? "ci" : "là"}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <SectionLabel>Revenus et dépenses de ce mois-ci</SectionLabel>

          {alerts && <AlertsPanel snapshot={alerts} />}

          {motivation && <MotivationCard snapshot={motivation} />}

          <QuickIncomeCard month={month} incomes={monthIncomes.map(toIncomeDto)} />

          {budget && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="font-heading text-sm font-semibold text-slate-700">
                Détail du mois
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Les charges fixes et mensualités de prêts restent constantes
                d&apos;un mois à l&apos;autre ; revenus et dépenses varient.
              </p>
              <div className="mt-3 flex flex-col divide-y divide-slate-100 text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Revenus du mois</span>
                  <span className="font-medium text-slate-900">
                    {formatCents(budget.incomeCents)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">
                    Charges fixes actives{" "}
                    <span className="text-xs text-slate-400">(constant)</span>
                  </span>
                  <span className="font-medium text-slate-900">
                    -{formatCents(budget.fixedChargesCents)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">
                    Mensualités de prêts{" "}
                    <span className="text-xs text-slate-400">(constant)</span>
                  </span>
                  <span className="font-medium text-slate-900">
                    -{formatCents(budget.loanPaymentsCents)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Dépenses déjà faites</span>
                  <span className="font-medium text-slate-900">
                    -{formatCents(budget.expensesCents)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-sm">
                  <span className="font-medium text-slate-700">
                    = Variation de {isCurrentMonth ? "ce mois-ci" : "ce mois-là"}
                  </span>
                  <span
                    className={`font-heading text-base font-semibold ${
                      isMonthPositive ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {formatCents(budget.availableCents)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isCurrentMonth && budget && budget.suggestedSavingsCents > 0 && (
            <a
              href="/savings"
              className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800 transition-colors hover:bg-teal-100"
            >
              Tu pourrais mettre{" "}
              <strong>{formatCents(budget.suggestedSavingsCents)}</strong> de
              côté ce mois-ci →
            </a>
          )}

          <CategoryBreakdownChart entries={spendingByCategory} />
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Ton solde</SectionLabel>

          {running && (
            <BalanceCard
              displayedCents={running.startingBalanceCents}
              balanceAsOf={running.declaredAsOf}
              balanceSource={running.balanceSource}
              isDeclared={running.isDeclared}
              isExactAnchor={month === running.anchorMonth}
              canEdit={isCurrentMonth}
            />
          )}

          {isCurrentMonth && <PurchaseSimulator />}

          <div className="mt-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="font-heading text-sm font-semibold text-slate-700">
              Exporter le bilan
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Bilan de {MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00.000Z`))}
            </p>
            <div className="mt-3 flex gap-2">
              <a
                href={`/api/export/excel?month=${month}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </a>
              <a
                href={`/api/export/pdf?month=${month}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
