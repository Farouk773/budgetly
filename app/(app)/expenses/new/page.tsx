import { prisma } from "@/backend/prisma";
import { NewExpenseForm } from "@/components/expenses/NewExpenseForm";

export default async function NewExpensePage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900">
        Ajouter une dépense
      </h1>
      <NewExpenseForm categories={categories} />
    </div>
  );
}
