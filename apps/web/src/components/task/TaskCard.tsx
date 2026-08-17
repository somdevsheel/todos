import Link from "next/link";
import { MessageSquare, Paperclip } from "lucide-react";
import type { TaskSummary } from "@arutech/shared-types";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/user/UserAvatar";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";

export interface TaskCardProps {
  task: TaskSummary;
  /** Kanban cards already show the column as status — skip the redundant badge there. */
  showStatus?: boolean;
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function TaskCard({ task, showStatus = true }: TaskCardProps) {
  const isOverdue = task.dueDate && task.status !== "COMPLETED" && task.status !== "CANCELLED" && new Date(task.dueDate) < new Date();

  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <Card className="flex flex-col gap-2 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--color-ink)]">{task.title}</p>
          {showStatus && <TaskStatusBadge status={task.status} />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TaskPriorityBadge priority={task.priority} />
          {task.dueDate && (
            <span className={isOverdue ? "text-xs font-medium text-[var(--color-danger)]" : "text-xs text-[var(--color-ink-muted)]"}>
              Due {formatDueDate(task.dueDate)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 4).map((assignee) => (
              <UserAvatar
                key={assignee.id}
                firstName={assignee.firstName}
                lastName={assignee.lastName}
                size="sm"
                className="ring-2 ring-[var(--color-surface)]"
              />
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
            {task.commentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                {task.commentCount}
              </span>
            )}
            {task.attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {task.attachmentCount}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
