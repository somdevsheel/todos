import Link from "next/link";
import { ArrowLeft, CalendarClock, MapPin, Video } from "lucide-react";
import type { EventDetail } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EditEventButton } from "@/components/calendar/EditEventButton";
import { EventDeleteButton } from "@/components/calendar/EventDeleteButton";
import { EventParticipantsEditor } from "@/components/calendar/EventParticipantsEditor";
import { RsvpControls } from "@/components/calendar/RsvpControls";
import { ReminderPicker } from "@/components/calendar/ReminderPicker";

function formatDateTime(iso: string, isAllDay: boolean): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(isAllDay ? {} : { hour: "numeric", minute: "2-digit", hour12: true }),
  });
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const accessToken = await getAccessTokenFromCookies();

  const event = await apiFetch<EventDetail>(`/events/${id}`, { accessToken });

  const canManage = event.createdByUserId === user.id || hasAnyRole(user, ["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const mine = event.participants.find((p) => p.id === user.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/calendar" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to calendar
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-[var(--color-ink)]">{event.title}</h1>
            {event.description && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{event.description}</p>}
          </div>
          {mine && <RsvpControls eventId={event.id} status={mine.rsvpStatus} />}
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" aria-hidden />
            {formatDateTime(event.startAt, event.isAllDay)} – {formatDateTime(event.endAt, event.isAllDay)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden />
              {event.location}
            </span>
          )}
          {event.meetingUrl && (
            <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--color-accent-strong)] hover:underline">
              <Video className="h-4 w-4" aria-hidden />
              Join meeting
            </a>
          )}
        </div>

        {canManage && (
          <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
            <EditEventButton event={event} />
            <EventDeleteButton eventId={event.id} />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <EventParticipantsEditor eventId={event.id} participants={event.participants} organizerId={event.createdByUserId} canManage={canManage} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder</CardTitle>
        </CardHeader>
        <ReminderPicker relatedEntityType="EVENT" relatedEntityId={event.id} referenceAt={event.startAt} />
      </Card>
    </div>
  );
}
