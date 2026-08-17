import type { CalendarView } from "@arutech/shared-types";

/**
 * Pure date-range math shared between calendar/page.tsx (which computes the
 * [from, to) window it asks the API for) and the view components (which
 * render grid cells for that same window) — kept in one place so the two
 * can never disagree about what "this month" or "this week" means, unlike
 * the rest of the app's one-off per-component date formatters (see
 * TaskCard.tsx's local formatDueDate) which don't need that guarantee.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Monday-start week, matching the rest of the world outside the US. */
export function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const dayIndex = (start.getDay() + 6) % 7; // 0 = Monday
  return addDays(start, -dayIndex);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Always exactly 6 weeks (42 days) so MonthView's grid height never jumps between months. */
export function getMonthGridDays(monthStart: Date): Date[] {
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface CalendarRange {
  from: Date;
  to: Date;
  /** Header label for CalendarNav, e.g. "August 2026" / "18 – 24 Aug 2026" / "Monday, 18 August". */
  label: string;
}

/** The [from, to) window + header label for the active view, anchored at `anchor`. */
export function rangeForView(view: CalendarView, anchor: Date): CalendarRange {
  switch (view) {
    case "month": {
      const from = startOfWeek(startOfMonth(anchor));
      const to = addDays(from, 42);
      return { from, to, label: anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
    }
    case "week": {
      const from = startOfWeek(anchor);
      const to = addDays(from, 7);
      const last = addDays(from, 6);
      const sameMonth = from.getMonth() === last.getMonth();
      const label = sameMonth
        ? `${from.getDate()} – ${last.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
        : `${from.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${last.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
      return { from, to, label };
    }
    case "day": {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1), label: anchor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) };
    }
    case "agenda": {
      const from = startOfDay(anchor);
      const to = addDays(from, 30);
      return { from, to, label: `Next 30 days from ${anchor.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` };
    }
  }
}

export function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDayHeading(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Events whose [startAt, endAt) interval overlaps the given calendar day — same overlap test as EventsService.findAll's DB query. */
export function eventsForDay<T extends { startAt: string; endAt: string }>(events: T[], day: Date): T[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + DAY_MS;
  return events.filter((e) => new Date(e.startAt).getTime() < dayEnd && new Date(e.endAt).getTime() > dayStart);
}
