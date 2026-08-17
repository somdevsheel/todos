"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import type { CurrentUser } from "@arutech/shared-types";
import { NAV_ITEMS, NAV_ICONS } from "@/lib/nav-config";
import { filterNavForUser } from "@/lib/rbac";
import { cn } from "@/lib/cn";

export function BottomNav({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const items = filterNavForUser(NAV_ITEMS, user).filter((item) => item.showInBottomNav);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
              active ? "text-[var(--color-accent-strong)]" : "text-[var(--color-ink-muted)]",
            )}
          >
            {Icon && <Icon className="h-5 w-5" aria-hidden />}
            {item.label}
          </Link>
        );
      })}
      <Link href="/settings" className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-[var(--color-ink-muted)]">
        <MoreHorizontal className="h-5 w-5" aria-hidden />
        More
      </Link>
    </nav>
  );
}
