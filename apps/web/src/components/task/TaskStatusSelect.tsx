"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@arutech/shared-types";

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleChange = async (next: TaskStatus) => {
    setPending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to update the task's status.");
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
    <select
      value={status}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as TaskStatus)}
      aria-label="Task status"
      className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm font-medium text-[var(--color-ink)] disabled:opacity-50"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {TASK_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
