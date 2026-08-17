import type { EventSummary } from "@arutech/shared-types";
import { EmptyState } from "@/components/ui/EmptyState";
import { addDays, formatDayHeading, isSameDay, startOfDay } from "@/lib/calendar-dates";
import { EventCard } from "./EventCard";

export function AgendaView({ events, anchor, currentUserId }: { events: EventSummary[]; anchor: Date; currentUserId: string }) {
  if (events.length === 0) {
    return <EmptyState title="Nothing coming up" description="Nothing on your calendar in the next 30 days." />;
  }

  // Group the already-range-fetched events by the day they start on, in
  // chronological order — a flat scannable list rather than a grid, the
  // same "just a list" complexity as TaskKanban's columns (no calendar
  // library, no hour-by-hour math).
  const days: Date[] = [];
  for (let cursor = startOfDay(anchor), i = 0; i < 30; i++, cursor = addDays(cursor, 1)) days.push(cursor);

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => isSameDay(new Date(e.startAt), day))
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
        if (dayEvents.length === 0) return null;

        return (
          <div key={day.toISOString()} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-[var(--color-ink-muted)]">{formatDayHeading(day)}</p>
            <div className="flex flex-col gap-2">
              {dayEvents.map((event) => (
                <EventCard key={event.id} event={event} currentUserId={currentUserId} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
