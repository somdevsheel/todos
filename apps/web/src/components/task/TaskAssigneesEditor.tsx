"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { UserAvatar } from "@/components/user/UserAvatar";
import { AssigneePicker, type AssigneeOption } from "./AssigneePicker";

export function TaskAssigneesEditor({ taskId, assignees }: { taskId: string; assignees: AssigneeOption[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const addAssignee = async (user: AssigneeOption) => {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to assign this person.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const removeAssignee = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees/${userId}`, { method: "DELETE" });
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
    <div className="flex flex-col gap-2">
      {assignees.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assignees.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-subtle)] py-1 pl-1 pr-2 text-xs text-[var(--color-ink)]"
            >
              <UserAvatar firstName={user.firstName} lastName={user.lastName} size="sm" />
              {user.firstName} {user.lastName}
              <button
                type="button"
                onClick={() => removeAssignee(user.id)}
                disabled={busyId === user.id}
                aria-label={`Unassign ${user.firstName} ${user.lastName}`}
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] disabled:opacity-50"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <AssigneePicker
        selected={[]}
        onChange={(users) => {
          const added = users[users.length - 1];
          if (added) void addAssignee(added);
        }}
        excludeUserIds={assignees.map((a) => a.id)}
        placeholder="Add an assignee…"
      />
    </div>
  );
}
