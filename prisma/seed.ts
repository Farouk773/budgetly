import { prisma } from "../lib/prisma";

const DEFAULT_CATEGORIES: { name: string; isEssential: boolean }[] = [
  { name: "Logement", isEssential: true },
  { name: "Alimentation", isEssential: true },
  { name: "Transport", isEssential: true },
  { name: "Santé", isEssential: true },
  { name: "Assurances", isEssential: true },
  { name: "Abonnements", isEssential: false },
  { name: "Loisirs", isEssential: false },
  { name: "Autre", isEssential: false },
];

async function main() {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { isEssential: category.isEssential },
      create: category,
    });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
