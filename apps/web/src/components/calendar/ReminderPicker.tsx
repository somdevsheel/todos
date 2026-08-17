"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import type { ReminderEntityType } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";

export interface ReminderPickerProps {
  relatedEntityType: ReminderEntityType;
  relatedEntityId: string;
  /** The task's dueDate / the event's startAt — every offset below is "before" this instant. */
  referenceAt: string;
}

const OFFSETS = [
  { label: "At the time", minutes: 0 },
  { label: "10 minutes before", minutes: 10 },
  { label: "30 minutes before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "1 day before", minutes: 24 * 60 },
] as const;

/**
 * Fire-and-forget — this component doesn't track whether a reminder was
 * already set (GET /reminders isn't fetched here) since Reminder rows have
 * no "one per entity" constraint (a user can stack several), so there's no
 * single existing state to reflect anyway; it just confirms via toast.
 */
export function ReminderPicker({ relatedEntityType, relatedEntityId, referenceAt }: ReminderPickerProps) {
  const [minutesBefore, setMinutesBefore] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);

  const setReminder = async () => {
    const remindAt = new Date(new Date(referenceAt).getTime() - minutesBefore * 60_000).toISOString();
    setSubmitting(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedEntityType, relatedEntityId, remindAt }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to set a reminder.");
        return;
      }
      toast.success("Reminder set");
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Bell className="h-4 w-4 text-[var(--color-ink-muted)]" aria-hidden />
      <select
        value={minutesBefore}
        onChange={(e) => setMinutesBefore(Number(e.target.value))}
        aria-label="Remind me"
        className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-ink)]"
      >
        {OFFSETS.map((o) => (
          <option key={o.minutes} value={o.minutes}>
            {o.label}
          </option>
        ))}
      </select>
      <Button type="button" variant="secondary" size="sm" loading={submitting} onClick={setReminder}>
        Remind me
      </Button>
    </div>
  );
}
