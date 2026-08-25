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
        <h1 className="font-heading text-xl font-semibold text-slate-900">
          Charges fixes récurrentes
        </h1>
        <Link
          href="/fixed-charges/new"
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" />
          Ajouter une charge
        </Link>
      </div>

      {fixedCharges.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          Aucune charge fixe enregistrée pour le moment.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-500">
            Total mensuel des charges actives :{" "}
            <span className="font-semibold text-slate-900">
              {formatCents(monthlyTotalCents)}
            </span>
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {fixedCharges.map((charge) => (
              <li
                key={charge.id}
                className={`flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 ${
                  charge.active ? "" : "opacity-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {charge.label}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {charge.category.name}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Prélevé le {charge.dayOfMonth} du mois
                    {charge.active ? "" : " · inactive"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
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
