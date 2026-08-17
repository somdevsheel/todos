"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TASK_STATUS_LABELS, type TaskStatus, type TaskSummary } from "@arutech/shared-types";
import { groupTasksByStatus } from "@/lib/task-kanban";
import { TaskKanbanCard } from "./TaskKanbanCard";

export function TaskKanban({ tasks }: { tasks: TaskSummary[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const columns = groupTasksByStatus(tasks);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    setPendingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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
      setPendingId(null);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((column) => (
        <div key={column.status} className="flex w-64 flex-none flex-col gap-3 rounded-xl bg-[var(--color-surface-subtle)] p-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              {TASK_STATUS_LABELS[column.status]}
            </p>
            <span className="text-xs text-[var(--color-ink-muted)]">{column.tasks.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {column.tasks.map((task) => (
              <TaskKanbanCard
                key={task.id}
                task={task}
                changingStatus={pendingId === task.id}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
              />
            ))}
            {column.tasks.length === 0 && <p className="px-1 text-xs text-[var(--color-ink-muted)]">Nothing here</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
