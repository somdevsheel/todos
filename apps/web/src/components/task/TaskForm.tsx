"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, type TaskDetail, type TaskPriority } from "@arutech/shared-types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AssigneePicker, type AssigneeOption } from "./AssigneePicker";

export interface TaskFormProps {
  /** Present when editing — pre-fills fields and PATCHes instead of POSTing. */
  task?: TaskDetail;
  onSuccess: (task: TaskDetail) => void;
  onCancel: () => void;
}

function toDateInputValue(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "MEDIUM");
  const [dueDate, setDueDate] = useState(toDateInputValue(task?.dueDate));
  const [assignees, setAssignees] = useState<AssigneeOption[]>(task?.assignees ?? []);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Give the task a title.");
      return;
    }

    setSubmitting(true);
    try {
      const path = task ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = task ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
      };
      if (!task) body.assigneeUserIds = assignees.map((a) => a.id);

      const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const responseBody = await res.json();
      if (!res.ok || !responseBody.success) {
        toast.error(responseBody?.error?.message ?? "Unable to save the task. Please try again.");
        return;
      }

      toast.success(task ? "Task updated" : "Task created");
      onSuccess(responseBody.data);
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-description" className="text-sm font-medium text-[var(--color-ink)]">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-priority" className="text-sm font-medium text-[var(--color-ink)]">
            Priority
          </label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      {!task && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--color-ink)]">Assign to</span>
          <AssigneePicker selected={assignees} onChange={setAssignees} />
          <p className="text-xs text-[var(--color-ink-muted)]">Leave empty to assign it to yourself.</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {task ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
