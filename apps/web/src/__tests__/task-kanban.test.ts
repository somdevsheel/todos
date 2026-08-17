import { describe, expect, it } from "vitest";
import type { TaskSummary } from "@arutech/shared-types";
import { groupTasksByStatus } from "@/lib/task-kanban";

function makeTask(overrides: Partial<TaskSummary>): TaskSummary {
  return {
    id: "task-1",
    organizationId: "org-1",
    title: "Task",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    startDate: null,
    dueDate: null,
    createdByUserId: "user-1",
    teamId: null,
    departmentId: null,
    parentTaskId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    assignees: [],
    commentCount: 0,
    attachmentCount: 0,
    subtaskCount: 0,
    ...overrides,
  };
}

describe("groupTasksByStatus", () => {
  it("returns all five status columns in a fixed order, even when some are empty", () => {
    const columns = groupTasksByStatus([]);
    expect(columns.map((c) => c.status)).toEqual(["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CANCELLED"]);
    expect(columns.every((c) => c.tasks.length === 0)).toBe(true);
  });

  it("places each task in the column matching its status", () => {
    const tasks = [
      makeTask({ id: "1", status: "TODO" }),
      makeTask({ id: "2", status: "IN_PROGRESS" }),
      makeTask({ id: "3", status: "TODO" }),
      makeTask({ id: "4", status: "COMPLETED" }),
    ];

    const columns = groupTasksByStatus(tasks);

    expect(columns.find((c) => c.status === "TODO")?.tasks.map((t) => t.id)).toEqual(["1", "3"]);
    expect(columns.find((c) => c.status === "IN_PROGRESS")?.tasks.map((t) => t.id)).toEqual(["2"]);
    expect(columns.find((c) => c.status === "COMPLETED")?.tasks.map((t) => t.id)).toEqual(["4"]);
    expect(columns.find((c) => c.status === "CANCELLED")?.tasks).toEqual([]);
  });
});
