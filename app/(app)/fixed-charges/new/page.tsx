import { getCategoriesForDropdown } from "@/backend/queries/categories";
import { NewFixedChargeForm } from "@/components/fixed-charges/NewFixedChargeForm";

export default async function NewFixedChargePage() {
  const categories = await getCategoriesForDropdown();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-xl font-semibold text-slate-900 dark:text-slate-100">
        Ajouter une charge fixe
      </h1>
      <NewFixedChargeForm categories={categories} />
    </div>
  );
}
