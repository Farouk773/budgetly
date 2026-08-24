import { getCurrentUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { currentMonthValue, getDeclaredBalance, getMonthlyBudget, monthRange } from "@/lib/queries/balance";
import { getSpendingByCategory } from "@/lib/queries/spending";
import { getMotivationSnapshot } from "@/lib/queries/motivation";
import { getAlertsSnapshot } from "@/lib/queries/alerts";
import { toIncomeDto } from "@/lib/serializers/income";
import { projectEndOfMonthCents } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { FileSpreadsheet, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { ProjectionCard } from "@/components/dashboard/ProjectionCard";
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

  const [budget, declared, spendingByCategory, motivation, alerts, monthIncomes] =
    user
      ? await Promise.all([
          getMonthlyBudget(user.id, month),
          getDeclaredBalance(user.id),
          getSpendingByCategory(user.id, month),
          isCurrentMonth ? getMotivationSnapshot(user.id) : Promise.resolve(null),
          isCurrentMonth ? getAlertsSnapshot(user.id) : Promise.resolve(null),
          prisma.income.findMany({
            where: { userId: user.id, periodMonth: monthRange(month) },
            orderBy: { createdAt: "asc" },
          }),
        ])
      : [null, null, [], null, null, []];

  const isPositive = (budget?.availableCents ?? 0) >= 0;
  const projectedCents =
    budget && declared?.balanceCents !== null && declared?.balanceCents !== undefined
      ? projectEndOfMonthCents({
          balanceCents: declared.balanceCents,
          monthlyAvailableCents: budget.availableCents,
        })
      : null;

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

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <SectionLabel>Revenus et dépenses de ce mois-ci</SectionLabel>

          <div
            className={`relative overflow-hidden rounded-3xl p-7 text-center shadow-lg sm:p-8 ${
              isPositive
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
            <div className="relative flex items-center justify-center gap-2 text-sm font-medium text-white/85">
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {isCurrentMonth ? "Il te reste ce mois-ci" : "Disponible ce mois-là"}
            </div>
            <p className="relative mt-2 font-heading text-5xl font-bold tracking-tight text-white">
              {formatCents(budget?.availableCents ?? 0)}
            </p>
          </div>

          {alerts && <AlertsPanel snapshot={alerts} />}

          {motivation && <MotivationCard snapshot={motivation} />}

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
              </div>
            </div>
          )}

          <QuickIncomeCard month={month} incomes={monthIncomes.map(toIncomeDto)} />

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
          <SectionLabel>Ton solde bancaire</SectionLabel>

          <BalanceCard
            balanceCents={declared?.balanceCents ?? null}
            balanceAsOf={declared?.balanceAsOf ?? null}
            isCurrentMonth={isCurrentMonth}
          />

          {isCurrentMonth && projectedCents !== null && (
            <ProjectionCard
              balanceCents={declared!.balanceCents!}
              monthlyAvailableCents={budget!.availableCents}
              projectedCents={projectedCents}
            />
          )}

          {isCurrentMonth && (
            <PurchaseSimulator hasDeclaredBalance={declared?.balanceCents !== null} />
          )}

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
