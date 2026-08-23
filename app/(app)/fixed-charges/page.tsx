import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";

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
        <h1 className="text-xl font-semibold text-zinc-900">
          Charges fixes récurrentes
        </h1>
        <Link
          href="/fixed-charges/new"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Ajouter une charge
        </Link>
      </div>

      {fixedCharges.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">
          Aucune charge fixe enregistrée pour le moment.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-zinc-500">
            Total mensuel des charges actives :{" "}
            <span className="font-semibold text-zinc-900">
              {formatCents(monthlyTotalCents)}
            </span>
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {fixedCharges.map((charge) => (
              <li
                key={charge.id}
                className={`flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ${
                  charge.active ? "" : "opacity-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {charge.label}
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      {charge.category.name}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Prélevé le {charge.dayOfMonth} du mois
                    {charge.active ? "" : " · inactive"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-zinc-900">
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
