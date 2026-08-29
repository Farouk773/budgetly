import { prisma } from "@/backend/prisma";
import type { Category } from "@/backend/types";

const CATCH_ALL_CATEGORY_NAME = "Autre";

/** Catégories triées par ordre alphabétique, sauf "Autre" qui est toujours
 * placée en dernier — c'est une catégorie fourre-tout, pas censée se
 * retrouver au milieu d'une liste alphabétique dans un menu déroulant. */
export async function getCategoriesForDropdown(): Promise<Category[]> {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return [
    ...categories.filter((c) => c.name !== CATCH_ALL_CATEGORY_NAME),
    ...categories.filter((c) => c.name === CATCH_ALL_CATEGORY_NAME),
  ];
}
