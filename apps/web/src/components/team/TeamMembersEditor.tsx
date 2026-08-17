"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { TeamMemberSummary } from "@arutech/shared-types";
import { UserAvatar } from "@/components/user/UserAvatar";
import { AssigneePicker, type AssigneeOption } from "@/components/task/AssigneePicker";

export function TeamMembersEditor({ teamId, members, canManage }: { teamId: string; members: TeamMemberSummary[]; canManage: boolean }) {
  const router = useRouter();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const addMember = async (user: AssigneeOption) => {
    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to add this person.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setBusyUserId(null);
    }
  };

  const removeMember = async (userId: string) => {
    setBusyUserId(userId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to remove this person.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {members.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">No members yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2">
              <div className="flex items-center gap-2">
                <UserAvatar firstName={member.user.firstName} lastName={member.user.lastName} avatarUrl={member.user.avatarUrl} size="sm" />
                <span className="text-sm text-[var(--color-ink)]">
                  {member.user.firstName} {member.user.lastName}
                </span>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => removeMember(member.userId)}
                  disabled={busyUserId === member.userId}
                  aria-label={`Remove ${member.user.firstName} ${member.user.lastName}`}
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <AssigneePicker
          selected={[]}
          onChange={(users) => {
            const added = users[users.length - 1];
            if (added) void addMember(added);
          }}
          excludeUserIds={members.map((m) => m.userId)}
          placeholder="Add a member…"
        />
      )}
    </div>
  );
}
