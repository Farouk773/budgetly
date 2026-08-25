"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.primary);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#0a0e1b]/95 md:hidden">
      {items.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
              isActive
                ? "text-brand-gradient [text-shadow:none]"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`}
              strokeWidth={isActive ? 2.4 : 2}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
