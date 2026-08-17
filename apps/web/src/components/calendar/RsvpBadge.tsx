import { EVENT_RSVP_STATUS_LABELS, type EventRsvpStatus } from "@arutech/shared-types";
import { cn } from "@/lib/cn";

const RSVP_STYLES: Record<EventRsvpStatus, string> = {
  PENDING: "bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)]",
  ACCEPTED: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
  DECLINED: "bg-red-100 text-red-800",
  TENTATIVE: "bg-amber-100 text-amber-800",
};

export function RsvpBadge({ status, className }: { status: EventRsvpStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", RSVP_STYLES[status], className)}>
      {EVENT_RSVP_STATUS_LABELS[status]}
    </span>
  );
}
