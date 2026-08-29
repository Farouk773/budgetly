import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { formatCents } from "@/backend/money";
import { ChargesAnalyticsChart } from "@/components/dashboard/analytics/ChargesAnalyticsChart";
import { FixedChargesList } from "@/components/fixed-charges/FixedChargesList";
import { DeleteAllButton } from "@/components/ui/DeleteAllButton";

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
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
          Charges fixes récurrentes
        </h1>
        <div className="flex items-center gap-2">
          <DeleteAllButton
            endpoint="/api/fixed-charges"
            count={fixedCharges.length}
            confirmTitle="Supprimer TOUTES les charges fixes ?"
            confirmDescription={`Cette action est définitive et supprimera les ${fixedCharges.length} charge${
              fixedCharges.length > 1 ? "s" : ""
            } fixe${fixedCharges.length > 1 ? "s" : ""} enregistrée${
              fixedCharges.length > 1 ? "s" : ""
            }. Elle ne peut pas être annulée.`}
          />
          <Link
            href="/fixed-charges/new"
            className="btn-base bg-brand-gradient flex items-center gap-1.5 px-3 py-2 text-sm text-white shadow-md shadow-indigo-900/15 hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Ajouter une charge
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {fixedCharges.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total mensuel des charges actives :{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCents(monthlyTotalCents, user?.currency)}
              </span>
            </p>
          )}
          <FixedChargesList
            fixedCharges={fixedCharges.map((charge) => ({
              id: charge.id,
              label: charge.label,
              categoryName: charge.category.name,
              amountCents: charge.amountCents,
              dayOfMonth: charge.dayOfMonth,
              active: charge.active,
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
              <ChargesAnalyticsChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
