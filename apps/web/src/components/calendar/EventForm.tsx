"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { EventDetail } from "@arutech/shared-types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AssigneePicker, type AssigneeOption } from "@/components/task/AssigneePicker";

export interface EventFormProps {
  /** Present when editing — pre-fills fields and PATCHes instead of POSTing. Participants are edited separately (see EventParticipantsEditor) once an event exists. */
  event?: EventDetail;
  onSuccess: (event: EventDetail) => void;
  onCancel: () => void;
}

function toDateTimeInputValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function EventForm({ event, onSuccess, onCancel }: EventFormProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? false);
  const [startAt, setStartAt] = useState(toDateTimeInputValue(event?.startAt));
  const [endAt, setEndAt] = useState(toDateTimeInputValue(event?.endAt));
  const [location, setLocation] = useState(event?.location ?? "");
  const [meetingUrl, setMeetingUrl] = useState(event?.meetingUrl ?? "");
  const [participants, setParticipants] = useState<AssigneeOption[]>(event?.participants ?? []);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give the event a title.");
      return;
    }
    if (!startAt || !endAt) {
      toast.error("Set a start and end time.");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      toast.error("The end time must be after the start time.");
      return;
    }

    setSubmitting(true);
    try {
      const path = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        isAllDay,
        location: location.trim() || undefined,
        meetingUrl: meetingUrl.trim() || undefined,
      };
      if (!event) body.participantUserIds = participants.map((p) => p.id);

      const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const responseBody = await res.json();
      if (!res.ok || !responseBody.success) {
        toast.error(responseBody?.error?.message ?? "Unable to save the event. Please try again.");
        return;
      }

      toast.success(event ? "Event updated" : "Event created");
      onSuccess(responseBody.data);
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-description" className="text-sm font-medium text-[var(--color-ink)]">
          Description
        </label>
        <textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
      </div>

      <label className="inline-flex w-fit items-center gap-2 text-sm text-[var(--color-ink)]">
        <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="h-4 w-4 rounded border-[var(--color-border)]" />
        All day
      </label>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Starts" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        <Input label="Ends" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 4, or a city" />
        <Input label="Meeting link" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://…" />
      </div>

      {!event && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--color-ink)]">Invite colleagues</span>
          <AssigneePicker selected={participants} onChange={setParticipants} placeholder="Search employees…" />
          <p className="text-xs text-[var(--color-ink-muted)]">You&apos;re on the event automatically — no need to add yourself.</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {event ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
