import { CalendarDays } from "lucide-react";
import type { EventSummary } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { formatTimeLabel } from "@/lib/calendar-dates";
import { StatCard } from "./StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

async function fetchUpcoming(): Promise<EventSummary[]> {
  const accessToken = await getAccessTokenFromCookies();
  const from = new Date();
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiFetch<EventSummary[]>(`/events?${query.toString()}`, { accessToken });
}

/** Real data since Phase 3 — replaces the hardcoded `comingSoon` StatCard placeholder. */
export async function UpcomingEventsStatCard() {
  const events = await fetchUpcoming();
  return <StatCard icon={CalendarDays} label="Upcoming events" value={events.length} hint="Next 7 days" />;
}

/** Replaces the "Calendar isn't built yet" EmptyState placeholder card. */
export async function UpcomingEventsCard() {
  const events = await fetchUpcoming();

  if (events.length === 0) {
    return <EmptyState icon={CalendarDays} title="Nothing on your calendar" description="Nothing scheduled in the next 7 days." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {events.slice(0, 5).map((event) => (
        <div key={event.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-[var(--color-ink)]">{event.title}</span>
          <span className="flex-none text-xs text-[var(--color-ink-muted)]">
            {event.isAllDay ? "All day" : formatTimeLabel(event.startAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
