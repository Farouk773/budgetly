"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1.5 py-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              isActive
                ? "bg-brand-gradient text-white shadow-sm shadow-indigo-900/15"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
