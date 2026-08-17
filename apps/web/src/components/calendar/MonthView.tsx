import Link from "next/link";
import type { EventSummary } from "@arutech/shared-types";
import { cn } from "@/lib/cn";
import { eventsForDay, formatTimeLabel, getMonthGridDays, isSameDay, startOfMonth } from "@/lib/calendar-dates";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS_PER_DAY = 3;

export function MonthView({ events, anchor }: { events: EventSummary[]; anchor: Date }) {
  const days = getMonthGridDays(startOfMonth(anchor));
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
      <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-1.5 text-center text-xs font-semibold text-[var(--color-ink-muted)]">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[6.5rem] flex-col gap-1 border-b border-r border-[var(--color-border)] p-1.5 last:border-r-0",
                !inMonth && "bg-[var(--color-surface-subtle)]/50",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  isToday ? "bg-[var(--color-accent)] font-semibold text-white" : "text-[var(--color-ink-muted)]",
                  !inMonth && "opacity-50",
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
                  <Link
                    key={event.id}
                    href={`/calendar/${event.id}`}
                    className="truncate rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[11px] text-[var(--color-accent-strong)] hover:opacity-80"
                    title={event.title}
                  >
                    {!event.isAllDay && <span className="mr-1 opacity-70">{formatTimeLabel(event.startAt)}</span>}
                    {event.title}
                  </Link>
                ))}
                {dayEvents.length > MAX_CHIPS_PER_DAY && (
                  <span className="px-1.5 text-[11px] text-[var(--color-ink-muted)]">+{dayEvents.length - MAX_CHIPS_PER_DAY} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
