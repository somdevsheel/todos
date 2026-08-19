import { TASK_STATUSES, type TaskStatus, type TaskSummary } from "@arutech/shared-types";

/**
 * Ported from apps/web/src/lib/task-kanban.ts — identical pure grouping
 * logic. Same deliberate-duplication call as apps/mobile/src/lib/calendar-dates.ts:
 * closing a mobile-specific gap, not refactoring web's already-deployed
 * import sites into a shared-types consolidation this pass didn't need.
 */
export interface TaskKanbanColumn {
  status: TaskStatus;
  tasks: TaskSummary[];
}

export function groupTasksByStatus(tasks: TaskSummary[]): TaskKanbanColumn[] {
  return TASK_STATUSES.map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) }));
}
