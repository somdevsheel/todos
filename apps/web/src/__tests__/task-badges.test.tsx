import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@arutech/shared-types";
import { TaskStatusBadge } from "@/components/task/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/task/TaskPriorityBadge";

describe("TaskStatusBadge", () => {
  it.each(TASK_STATUSES)("renders the correct label for status %s", (status) => {
    render(<TaskStatusBadge status={status} />);
    expect(screen.getByText(TASK_STATUS_LABELS[status])).toBeInTheDocument();
  });
});

describe("TaskPriorityBadge", () => {
  it.each(TASK_PRIORITIES)("renders the correct label for priority %s", (priority) => {
    render(<TaskPriorityBadge priority={priority} />);
    expect(screen.getByText(TASK_PRIORITY_LABELS[priority])).toBeInTheDocument();
  });
});
