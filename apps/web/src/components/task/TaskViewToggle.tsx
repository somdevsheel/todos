"use client";

import { LayoutGrid, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export function TaskViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const layout = searchParams.get("layout") === "kanban" ? "kanban" : "list";

  const setLayout = (next: "list" | "kanban") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("layout", next);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5">
      {(
        [
          { key: "list", label: "List", icon: List },
          { key: "kanban", label: "Kanban", icon: LayoutGrid },
        ] as const
      ).map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setLayout(key)}
          aria-pressed={layout === key}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
            layout === key ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]" : "text-[var(--color-ink-muted)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
