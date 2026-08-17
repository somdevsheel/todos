import { Suspense } from "react";
import type { PaginatedResult, TaskSummary } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { TaskFilters } from "@/components/task/TaskFilters";
import { TaskViewToggle } from "@/components/task/TaskViewToggle";
import { CreateTaskButton } from "@/components/task/CreateTaskButton";
import { TaskList } from "@/components/task/TaskList";
import { TaskKanban } from "@/components/task/TaskKanban";

interface TasksPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const layout = params.layout === "kanban" ? "kanban" : "list";

  const query = new URLSearchParams();
  // Kanban shows every status side by side, so it needs a wider page than
  // the list view's default — see the note on TasksPage's known
  // simplification (no infinite scroll yet) in ARCHITECTURE.md's Phase 2 entry.
  query.set("pageSize", layout === "kanban" ? "100" : "20");
  for (const key of ["view", "status", "priority", "search"]) {
    const value = params[key];
    if (value) query.set(key, value);
  }

  const accessToken = await getAccessTokenFromCookies();
  const { items: tasks } = await apiFetch<PaginatedResult<TaskSummary>>(`/tasks?${query.toString()}`, { accessToken });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Tasks</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Track, assign, and complete work across the team.</p>
        </div>
        <div className="flex items-center gap-2">
          <TaskViewToggle />
          <CreateTaskButton />
        </div>
      </div>

      <Suspense>
        <TaskFilters />
      </Suspense>

      {layout === "kanban" ? <TaskKanban tasks={tasks} /> : <TaskList tasks={tasks} />}
    </div>
  );
}
