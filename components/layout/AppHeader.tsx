import Link from "next/link";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function AppHeader({ user }: { user: AuthUser }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-4 text-sm font-medium text-zinc-700">
          <Link href="/dashboard">Tableau de bord</Link>
          <Link href="/incomes">Revenus</Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
