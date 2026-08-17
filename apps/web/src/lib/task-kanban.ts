import { TASK_STATUSES, type TaskStatus, type TaskSummary } from "@arutech/shared-types";

export interface TaskKanbanColumn {
  status: TaskStatus;
  tasks: TaskSummary[];
}

/** Pure grouping logic, split out from TaskKanban.tsx so it's testable without rendering. */
export function groupTasksByStatus(tasks: TaskSummary[]): TaskKanbanColumn[] {
  return TASK_STATUSES.map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) }));
}
