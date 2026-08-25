import Link from "next/link";
import { PiggyBank } from "lucide-react";
import type { AuthUser } from "@/backend/types";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DesktopNav } from "@/components/layout/DesktopNav";

export function AppHeader({ user }: { user: AuthUser }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-[#0a0e1b]/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-heading text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          <span className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm shadow-indigo-900/20">
            <PiggyBank className="h-4.5 w-4.5" />
          </span>
          Budgetly
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="hidden text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 sm:inline"
          >
            {user.email}
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="hidden border-t border-slate-100 md:block dark:border-white/5">
        <div className="mx-auto max-w-5xl px-4">
          <DesktopNav />
        </div>
      </div>
    </header>
  );
}
