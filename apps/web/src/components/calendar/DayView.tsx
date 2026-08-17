import type { EventSummary } from "@arutech/shared-types";
import { EmptyState } from "@/components/ui/EmptyState";
import { eventsForDay } from "@/lib/calendar-dates";
import { EventCard } from "./EventCard";

export function DayView({ events, anchor, currentUserId }: { events: EventSummary[]; anchor: Date; currentUserId: string }) {
  const dayEvents = eventsForDay(events, anchor).sort((a, b) => a.startAt.localeCompare(b.startAt));

  if (dayEvents.length === 0) {
    return <EmptyState title="Nothing scheduled" description="Create an event to put it on this day's calendar." />;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-2">
      {dayEvents.map((event) => (
        <EventCard key={event.id} event={event} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
