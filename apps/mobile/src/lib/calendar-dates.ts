import type { CalendarView } from "@arutech/shared-types";

/**
 * Ported from apps/web/src/lib/calendar-dates.ts — identical pure date-range
 * math (no React/RN dependencies in the original), duplicated here rather
 * than factored into packages/shared-types. Deliberate scope call: this is
 * closing a mobile-specific gap, not a cross-app refactor — moving it to
 * shared-types would mean touching web's already-deployed, already-verified
 * import sites for a nice-to-have consolidation, not something this pass
 * needed. Worth doing later if the two ever need to be guaranteed identical
 * beyond "copied once, matching at copy time."
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Monday-start week, matching the web app. */
export function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const dayIndex = (start.getDay() + 6) % 7; // 0 = Monday
  return addDays(start, -dayIndex);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Always exactly 6 weeks (42 days) so the month grid's height never jumps between months. */
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
  /** Header label, e.g. "August 2026" / "18 – 24 Aug 2026" / "Monday, 18 August". */
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

/** Events whose [startAt, endAt) interval overlaps the given calendar day — same overlap test as EventsService.findAll's DB query. */
export function eventsForDay<T extends { startAt: string; endAt: string }>(events: T[], day: Date): T[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + DAY_MS;
  return events.filter((e) => new Date(e.startAt).getTime() < dayEnd && new Date(e.endAt).getTime() > dayStart);
}
