"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EVENT_RSVP_STATUS_LABELS, type EventRsvpStatus } from "@arutech/shared-types";

const RESPONSE_OPTIONS: EventRsvpStatus[] = ["ACCEPTED", "TENTATIVE", "DECLINED"];

export function RsvpControls({ eventId, status }: { eventId: string; status: EventRsvpStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const respond = async (next: EventRsvpStatus) => {
    setPending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to update your RSVP.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5">
      {RESPONSE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          disabled={pending}
          onClick={() => respond(option)}
          aria-pressed={status === option}
          className={
            status === option
              ? "rounded-md bg-[var(--color-accent-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-accent-strong)]"
              : "rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] disabled:opacity-50"
          }
        >
          {EVENT_RSVP_STATUS_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
