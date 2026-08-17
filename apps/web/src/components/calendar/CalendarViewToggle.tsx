"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CALENDAR_VIEWS, type CalendarView } from "@arutech/shared-types";
import { cn } from "@/lib/cn";

const VIEW_LABELS: Record<CalendarView, string> = { month: "Month", week: "Week", day: "Day", agenda: "Agenda" };

export function CalendarViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as CalendarView | null) ?? "month";

  const setView = (next: CalendarView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5">
      {CALENDAR_VIEWS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setView(key)}
          aria-pressed={view === key}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium",
            view === key ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]" : "text-[var(--color-ink-muted)]",
          )}
        >
          {VIEW_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
