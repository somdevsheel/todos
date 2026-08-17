"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarView } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";
import { addDays, startOfMonth } from "@/lib/calendar-dates";

const STEP_DAYS: Record<CalendarView, number> = { month: 0, week: 7, day: 1, agenda: 30 };

function step(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  if (view === "month") {
    return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  }
  return addDays(anchor, STEP_DAYS[view] * direction);
}

export function CalendarNav({ view, anchor, label }: { view: CalendarView; anchor: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const anchorDate = new Date(anchor);

  const go = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", date.toISOString().slice(0, 10));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => go(step(view, anchorDate, -1))} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => go(view === "month" ? startOfMonth(new Date()) : new Date())}>
          Today
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => go(step(view, anchorDate, 1))} aria-label="Next">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <h2 className="text-sm font-semibold text-[var(--color-ink)]">{label}</h2>
    </div>
  );
}
