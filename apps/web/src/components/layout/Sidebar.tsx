"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CurrentUser } from "@arutech/shared-types";
import { NAV_ITEMS, NAV_ICONS } from "@/lib/nav-config";
import { filterNavForUser } from "@/lib/rbac";
import { cn } from "@/lib/cn";

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const items = filterNavForUser(NAV_ITEMS, user);

  return (
    <aside className="hidden md:flex md:w-60 md:flex-none md:flex-col md:border-r md:border-[var(--color-border)] md:bg-[var(--color-surface)] md:p-4">
      <div className="mb-6 px-2">
        <p className="text-sm font-semibold text-[var(--color-ink)]">Arutech Workspace</p>
        <p className="text-xs text-[var(--color-ink-muted)]">Arutech Consultancy Services LLP</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"
                  : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]",
              )}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden />}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
