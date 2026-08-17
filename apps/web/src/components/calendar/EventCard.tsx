import Link from "next/link";
import { MapPin } from "lucide-react";
import type { EventSummary } from "@arutech/shared-types";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/user/UserAvatar";
import { formatTimeLabel } from "@/lib/calendar-dates";
import { RsvpBadge } from "./RsvpBadge";

export interface EventCardProps {
  event: EventSummary;
  currentUserId: string;
}

export function EventCard({ event, currentUserId }: EventCardProps) {
  const mine = event.participants.find((p) => p.id === currentUserId);
  const timeLabel = event.isAllDay ? "All day" : `${formatTimeLabel(event.startAt)} – ${formatTimeLabel(event.endAt)}`;

  return (
    <Link href={`/calendar/${event.id}`} className="block">
      <Card className="flex flex-col gap-2 p-3 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--color-ink)]">{event.title}</p>
          {mine && <RsvpBadge status={mine.rsvpStatus} />}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <span>{timeLabel}</span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {event.location}
            </span>
          )}
        </div>

        {event.participants.length > 0 && (
          <div className="flex -space-x-1.5 pt-1">
            {event.participants.slice(0, 5).map((participant) => (
              <UserAvatar
                key={participant.id}
                firstName={participant.firstName}
                lastName={participant.lastName}
                size="sm"
                className="ring-2 ring-[var(--color-surface)]"
              />
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
