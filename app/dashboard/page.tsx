import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          Bienvenue{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
        <p className="mt-6 text-sm text-zinc-500">
          Le tableau de bord budgétaire arrive dans une prochaine phase.
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
