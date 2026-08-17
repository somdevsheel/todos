"use client";

import Link from "next/link";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus, type TaskSummary } from "@arutech/shared-types";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/user/UserAvatar";
import { TaskPriorityBadge } from "./TaskPriorityBadge";

export interface TaskKanbanCardProps {
  task: TaskSummary;
  onStatusChange: (status: TaskStatus) => void;
  changingStatus: boolean;
}

/**
 * Per the product decision for this phase: moving a task between columns
 * is a status dropdown on the card, not a drag gesture — fully functional
 * without pulling in a drag-and-drop library this early.
 */
export function TaskKanbanCard({ task, onStatusChange, changingStatus }: TaskKanbanCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-[var(--color-ink)] hover:underline">
        {task.title}
      </Link>
      <TaskPriorityBadge priority={task.priority} className="self-start" />
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((assignee) => (
            <UserAvatar key={assignee.id} firstName={assignee.firstName} lastName={assignee.lastName} size="sm" className="ring-2 ring-[var(--color-surface)]" />
          ))}
        </div>
        <select
          value={task.status}
          disabled={changingStatus}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          aria-label={`Change status for ${task.title}`}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-xs text-[var(--color-ink)] disabled:opacity-50"
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {TASK_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}
