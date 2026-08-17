import { CheckSquare, Clock3 } from "lucide-react";
import type { TaskStats } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { StatCard } from "./StatCard";

/** Real data since Phase 2 — GET /tasks/stats replaces the Phase 1 hardcoded placeholders. */
export async function TaskStatsWidgets() {
  const accessToken = await getAccessTokenFromCookies();
  const stats = await apiFetch<TaskStats>("/tasks/stats", { accessToken });

  return (
    <>
      <StatCard icon={CheckSquare} label="My tasks" value={stats.myTasks} />
      <StatCard icon={Clock3} label="Due today" value={stats.dueToday} />
      <StatCard icon={Clock3} label="Overdue" value={stats.overdue} hint={stats.overdue > 0 ? "Needs attention" : undefined} />
    </>
  );
}
