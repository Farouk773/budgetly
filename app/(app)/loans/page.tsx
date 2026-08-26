import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { formatCents } from "@/backend/money";
import { toLoanDto } from "@/backend/serializers/loan";
import { LoanCard } from "@/components/loans/LoanCard";
import { PretAnalyticsChart } from "@/components/dashboard/analytics/PretAnalyticsChart";

export default async function LoansPage() {
  const user = await getCurrentUser();
  const loans = user
    ? await prisma.loan.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const monthlyTotalCents = loans
    .filter((l) => l.active)
    .reduce((sum, l) => sum + l.monthlyPaymentCents, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
          Dettes et prêts
        </h1>
        <Link
          href="/loans/new"
          className="btn-base bg-brand-gradient flex items-center gap-1.5 px-3 py-2 text-sm text-white shadow-md shadow-indigo-900/15 hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Ajouter un prêt
        </Link>
      </div>

      <div className="card-surface mt-6 p-5">
        <p className="font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">
          Évolution
        </p>
        <div className="mt-4">
          <PretAnalyticsChart />
        </div>
      </div>

      {loans.length > 0 && (
        <>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Impact mensuel des prêts actifs sur ton budget :{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              -{formatCents(monthlyTotalCents)}
            </span>
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {loans.map((loan) => (
              <LoanCard key={loan.id} loan={toLoanDto(loan)} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
