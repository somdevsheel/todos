import type { EventSummary, CalendarView } from "@arutech/shared-types";
import { CALENDAR_VIEWS } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";
import { rangeForView } from "@/lib/calendar-dates";
import { CalendarNav } from "@/components/calendar/CalendarNav";
import { CalendarViewToggle } from "@/components/calendar/CalendarViewToggle";
import { CreateEventButton } from "@/components/calendar/CreateEventButton";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { AgendaView } from "@/components/calendar/AgendaView";

interface CalendarPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const user = await requireAuth();

  const view: CalendarView = CALENDAR_VIEWS.includes(params.view as CalendarView) ? (params.view as CalendarView) : "month";
  const anchor = params.date ? new Date(params.date) : new Date();
  const range = rangeForView(view, anchor);

  const query = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
  if (params.teamId) query.set("teamId", params.teamId);

  const accessToken = await getAccessTokenFromCookies();
  const events = await apiFetch<EventSummary[]>(`/events?${query.toString()}`, { accessToken });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Calendar</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Your events and meetings — see ARCHITECTURE.md for team calendars.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarViewToggle />
          <CreateEventButton />
        </div>
      </div>

      <CalendarNav view={view} anchor={anchor.toISOString()} label={range.label} />

      {view === "month" && <MonthView events={events} anchor={anchor} />}
      {view === "week" && <WeekView events={events} anchor={anchor} currentUserId={user.id} />}
      {view === "day" && <DayView events={events} anchor={anchor} currentUserId={user.id} />}
      {view === "agenda" && <AgendaView events={events} anchor={anchor} currentUserId={user.id} />}
    </div>
  );
}
