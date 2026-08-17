"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS, TASK_VIEWS, type TaskView } from "@arutech/shared-types";

const VIEW_LABELS: Record<TaskView, string> = {
  mine: "My tasks",
  assigned: "Assigned to me",
  created: "Created by me",
  team: "My team",
  completed: "Completed",
  overdue: "Overdue",
};

const SELECT_CLASS =
  "h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

export function TaskFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) update("search", search);
    }, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={searchParams.get("view") ?? ""} onChange={(e) => update("view", e.target.value)} className={SELECT_CLASS}>
        <option value="">All visible tasks</option>
        {TASK_VIEWS.map((view) => (
          <option key={view} value={view}>
            {VIEW_LABELS[view]}
          </option>
        ))}
      </select>

      <select value={searchParams.get("status") ?? ""} onChange={(e) => update("status", e.target.value)} className={SELECT_CLASS}>
        <option value="">Any status</option>
        {TASK_STATUSES.map((status) => (
          <option key={status} value={status}>
            {TASK_STATUS_LABELS[status]}
          </option>
        ))}
      </select>

      <select value={searchParams.get("priority") ?? ""} onChange={(e) => update("priority", e.target.value)} className={SELECT_CLASS}>
        <option value="">Any priority</option>
        {TASK_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {TASK_PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tasks…"
        className="h-9 min-w-[10rem] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      />
    </div>
  );
}
