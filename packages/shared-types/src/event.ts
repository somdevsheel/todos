export const EVENT_RSVP_STATUSES = ["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"] as const;
export type EventRsvpStatus = (typeof EVENT_RSVP_STATUSES)[number];

export const EVENT_RSVP_STATUS_LABELS: Record<EventRsvpStatus, string> = {
  PENDING: "Awaiting response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  TENTATIVE: "Tentative",
};

/** Query shortcut for the calendar UI's four render modes — see calendar/page.tsx. */
export const CALENDAR_VIEWS = ["month", "week", "day", "agenda"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export interface EventParticipantSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  rsvpStatus: EventRsvpStatus;
}

export interface EventSummary {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location?: string | null;
  meetingUrl?: string | null;
  createdByUserId: string;
  teamId?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: EventParticipantSummary[];
}

// No further fields beyond EventSummary today — kept as a distinct alias
// (mirrors TaskDetail extending TaskSummary) so a detail-only field can be
// added later without widening every list-response payload.
export type EventDetail = EventSummary;
