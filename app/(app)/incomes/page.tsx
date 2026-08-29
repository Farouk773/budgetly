import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { RevenuAnalyticsChart } from "@/components/dashboard/analytics/RevenuAnalyticsChart";
import { IncomesList } from "@/components/incomes/IncomesList";
import { DeleteAllButton } from "@/components/ui/DeleteAllButton";

export default async function IncomesPage() {
  const user = await getCurrentUser();
  const incomes = user
    ? await prisma.income.findMany({
        where: { userId: user.id },
        orderBy: { periodMonth: "desc" },
      })
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
          Historique des revenus
        </h1>
        <div className="flex items-center gap-2">
          <DeleteAllButton
            endpoint="/api/incomes"
            count={incomes.length}
            confirmTitle="Supprimer TOUS les revenus ?"
            confirmDescription={`Cette action est définitive et supprimera les ${incomes.length} revenu${
              incomes.length > 1 ? "s" : ""
            } enregistré${incomes.length > 1 ? "s" : ""} (fiches de paie jointes incluses). Elle ne peut pas être annulée.`}
          />
          <Link
            href="/incomes/new"
            className="btn-base bg-brand-gradient flex items-center gap-1.5 px-3 py-2 text-sm text-white shadow-md shadow-indigo-900/15 hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Ajouter un revenu
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomesList
            incomes={incomes.map((income) => ({
              id: income.id,
              type: income.type,
              label: income.label,
              netAmountCents: income.netAmountCents,
              periodMonth: income.periodMonth,
              isRecurring: income.isRecurring,
              payslipOriginalName: income.payslipOriginalName,
            }))}
            currency={user?.currency}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="card-surface p-5 lg:sticky lg:top-24">
            <p className="font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">
              Évolution
            </p>
            <div className="mt-4">
              <RevenuAnalyticsChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
