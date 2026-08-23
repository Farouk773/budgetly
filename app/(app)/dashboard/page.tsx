import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          Bienvenue{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-6 text-sm text-zinc-500">
          Le tableau de bord budgétaire (solde en temps réel) arrive dans une
          prochaine phase.
        </p>
      </div>
    </div>
  );
}
