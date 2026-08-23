import { getCurrentUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { currentMonthValue, getDeclaredBalance, getMonthlyBudget } from "@/lib/queries/balance";
import { getSpendingByCategory } from "@/lib/queries/spending";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { PurchaseSimulator } from "@/components/dashboard/PurchaseSimulator";
import { CategoryBreakdownChart } from "@/components/dashboard/CategoryBreakdownChart";

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const month = currentMonthValue();

  const [budget, declared, spendingByCategory] = user
    ? await Promise.all([
        getMonthlyBudget(user.id, month),
        getDeclaredBalance(user.id),
        getSpendingByCategory(user.id, month),
      ])
    : [null, null, []];

  const isPositive = (budget?.availableCents ?? 0) >= 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
      <h1 className="text-xl font-semibold text-zinc-900">
        Bienvenue{user?.name ? `, ${user.name}` : ""}
      </h1>

      <div
        className={`rounded-2xl p-6 text-center shadow-sm ${
          isPositive ? "bg-emerald-50" : "bg-amber-50"
        }`}
      >
        <p className="text-sm text-zinc-600">
          Il te reste ce mois-ci ({MONTH_FORMATTER.format(new Date())})
        </p>
        <p
          className={`mt-1 text-4xl font-bold ${
            isPositive ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {formatCents(budget?.availableCents ?? 0)}
        </p>
      </div>

      {budget && (
        <div className="rounded-xl bg-white p-4 text-sm shadow-sm">
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Revenus du mois</span>
            <span className="font-medium text-zinc-900">
              {formatCents(budget.incomeCents)}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Charges fixes actives</span>
            <span className="font-medium text-zinc-900">
              -{formatCents(budget.fixedChargesCents)}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Dépenses déjà faites</span>
            <span className="font-medium text-zinc-900">
              -{formatCents(budget.expensesCents)}
            </span>
          </div>
        </div>
      )}

      <CategoryBreakdownChart entries={spendingByCategory} />

      <BalanceCard
        balanceCents={declared?.balanceCents ?? null}
        balanceAsOf={declared?.balanceAsOf ?? null}
      />

      <PurchaseSimulator hasDeclaredBalance={declared?.balanceCents !== null} />
    </div>
  );
}
