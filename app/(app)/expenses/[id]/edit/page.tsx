import { notFound } from "next/navigation";
import { getCurrentUser } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { toExpenseDto } from "@/backend/serializers/expense";
import { getCategoriesForDropdown } from "@/backend/queries/categories";
import { EditExpenseForm } from "@/components/expenses/EditExpenseForm";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const expense = user
    ? await prisma.expense.findUnique({ where: { id }, include: { category: true } })
    : null;

  if (!user || !expense || expense.userId !== user.id) {
    notFound();
  }

  const categories = await getCategoriesForDropdown();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
        Corriger cette dépense
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Un montant mal renseigné ? Corrige-le ici.
      </p>
      <EditExpenseForm expense={toExpenseDto(expense)} categories={categories} />
    </div>
  );
}
