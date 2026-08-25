import { notFound } from "next/navigation";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toIncomeDto } from "@/backend/serializers/income";
import { EditIncomeForm } from "@/components/incomes/EditIncomeForm";

export default async function EditIncomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const income = user
    ? await prisma.income.findUnique({ where: { id } })
    : null;

  if (!user || !income || income.userId !== user.id) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
        Corriger ce revenu
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Un montant mal renseigné ou mal extrait ? Corrige-le ici.
      </p>
      <EditIncomeForm income={toIncomeDto(income)} />
    </div>
  );
}
