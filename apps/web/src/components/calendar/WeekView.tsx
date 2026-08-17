import type { EventSummary } from "@arutech/shared-types";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { eventsForDay, formatDayHeading, getWeekDays, isSameDay, startOfWeek } from "@/lib/calendar-dates";
import { EventCard } from "./EventCard";

export function WeekView({ events, anchor, currentUserId }: { events: EventSummary[]; anchor: Date; currentUserId: string }) {
  const days = getWeekDays(startOfWeek(anchor));
  const today = new Date();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const dayEvents = eventsForDay(events, day);
        return (
          <div key={day.toISOString()} className="flex flex-col gap-2">
            <p className={cn("text-xs font-semibold", isSameDay(day, today) ? "text-[var(--color-accent-strong)]" : "text-[var(--color-ink-muted)]")}>
              {formatDayHeading(day)}
            </p>
            <div className="flex flex-col gap-2">
              {dayEvents.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-muted)]">—</p>
              ) : (
                dayEvents.map((event) => <EventCard key={event.id} event={event} currentUserId={currentUserId} />)
              )}
            </div>
          </div>
        );
      })}
      {events.length === 0 && (
        <div className="col-span-full">
          <EmptyState title="Nothing scheduled this week" description="Create an event to put it on the calendar." />
        </div>
      )}
    </div>
  );
}
