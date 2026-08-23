import Link from "next/link";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function AppHeader({ user }: { user: AuthUser }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-zinc-700">
          <Link href="/dashboard">Tableau de bord</Link>
          <Link href="/incomes">Revenus</Link>
          <Link href="/expenses">Dépenses</Link>
          <Link href="/fixed-charges">Charges fixes</Link>
          <Link href="/savings">Épargne</Link>
          <Link href="/loans">Prêts</Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
