"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { EventParticipantSummary } from "@arutech/shared-types";
import { UserAvatar } from "@/components/user/UserAvatar";
import { AssigneePicker, type AssigneeOption } from "@/components/task/AssigneePicker";
import { RsvpBadge } from "./RsvpBadge";

export interface EventParticipantsEditorProps {
  eventId: string;
  participants: EventParticipantSummary[];
  organizerId: string;
  /** Only the organizer or a privileged role may add/remove other people (see EventsService) — everyone else sees a read-only list. */
  canManage: boolean;
}

export function EventParticipantsEditor({ eventId, participants, organizerId, canManage }: EventParticipantsEditorProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const addParticipant = async (user: AssigneeOption) => {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/events/${eventId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to invite this person.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const removeParticipant = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/events/${eventId}/participants/${userId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to remove this person.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2">
            <div className="flex items-center gap-2">
              <UserAvatar firstName={participant.firstName} lastName={participant.lastName} size="sm" />
              <span className="text-sm text-[var(--color-ink)]">
                {participant.firstName} {participant.lastName}
                {participant.id === organizerId && <span className="ml-1.5 text-xs text-[var(--color-ink-muted)]">(organizer)</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RsvpBadge status={participant.rsvpStatus} />
              {canManage && participant.id !== organizerId && (
                <button
                  type="button"
                  onClick={() => removeParticipant(participant.id)}
                  disabled={busyId === participant.id}
                  aria-label={`Remove ${participant.firstName} ${participant.lastName}`}
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canManage && (
        <AssigneePicker
          selected={[]}
          onChange={(users) => {
            const added = users[users.length - 1];
            if (added) void addParticipant(added);
          }}
          excludeUserIds={participants.map((p) => p.id)}
          placeholder="Invite someone else…"
        />
      )}
    </div>
  );
}
