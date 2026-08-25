import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { formatCents } from "@/backend/money";

export default async function FixedChargesPage() {
  const user = await getCurrentUser();
  const fixedCharges = user
    ? await prisma.fixedCharge.findMany({
        where: { userId: user.id },
        include: { category: true },
        orderBy: { dayOfMonth: "asc" },
      })
    : [];

  const monthlyTotalCents = fixedCharges
    .filter((c) => c.active)
    .reduce((sum, c) => sum + c.amountCents, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
          Charges fixes récurrentes
        </h1>
        <Link
          href="/fixed-charges/new"
          className="btn-base bg-brand-gradient flex items-center gap-1.5 px-3 py-2 text-sm text-white shadow-md shadow-indigo-900/15 hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Ajouter une charge
        </Link>
      </div>

      {fixedCharges.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Aucune charge fixe enregistrée pour le moment.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Total mensuel des charges actives :{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCents(monthlyTotalCents)}
            </span>
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {fixedCharges.map((charge) => (
              <li
                key={charge.id}
                className={`card-surface flex items-center justify-between p-5 ${
                  charge.active ? "" : "opacity-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {charge.label}
                    <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                      {charge.category.name}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Prélevé le {charge.dayOfMonth} du mois
                    {charge.active ? "" : " · inactive"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatCents(charge.amountCents)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
