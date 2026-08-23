import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { toLoanDto } from "@/lib/serializers/loan";
import { LoanCard } from "@/components/loans/LoanCard";

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
        <h1 className="text-xl font-semibold text-zinc-900">
          Dettes et prêts
        </h1>
        <Link
          href="/loans/new"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Ajouter un prêt
        </Link>
      </div>

      {loans.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">
          Aucun prêt enregistré pour le moment.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-zinc-500">
            Impact mensuel des prêts actifs sur ton budget :{" "}
            <span className="font-semibold text-zinc-900">
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
