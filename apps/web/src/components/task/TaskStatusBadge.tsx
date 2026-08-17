import { TASK_STATUS_LABELS, type TaskStatus } from "@arutech/shared-types";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: "bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)]",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
  CANCELLED: "bg-red-100 text-red-800",
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status], className)}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
