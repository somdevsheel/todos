import { TASK_PRIORITY_LABELS, type TaskPriority } from "@arutech/shared-types";
import { cn } from "@/lib/cn";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: "bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)]",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-red-100 text-red-800",
};

export function TaskPriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_STYLES[priority], className)}>
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}
