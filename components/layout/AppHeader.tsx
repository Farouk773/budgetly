import Link from "next/link";
import { PiggyBank } from "lucide-react";
import type { AuthUser } from "@/backend/types";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DesktopNav } from "@/components/layout/DesktopNav";

export function AppHeader({ user }: { user: AuthUser }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-heading text-lg font-semibold text-slate-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-700 text-white">
            <PiggyBank className="h-4.5 w-4.5" />
          </span>
          <span className="hidden sm:inline">Budgetly</span>
        </Link>

        <DesktopNav />

        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="hidden text-sm text-slate-500 hover:text-slate-700 sm:inline"
          >
            {user.email}
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
