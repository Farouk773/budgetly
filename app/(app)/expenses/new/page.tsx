import { getCategoriesForDropdown } from "@/backend/queries/categories";
import { NewExpenseForm } from "@/components/expenses/NewExpenseForm";

export default async function NewExpensePage() {
  const categories = await getCategoriesForDropdown();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
        Ajouter une dépense
      </h1>
      <NewExpenseForm categories={categories} />
    </div>
  );
}
