import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PaginatedResult, TaskCommentSummary, TaskDetail } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TaskPriorityBadge } from "@/components/task/TaskPriorityBadge";
import { TaskStatusSelect } from "@/components/task/TaskStatusSelect";
import { TaskAssigneesEditor } from "@/components/task/TaskAssigneesEditor";
import { TaskAttachments } from "@/components/task/TaskAttachments";
import { TaskComments } from "@/components/task/TaskComments";
import { TaskStatusBadge } from "@/components/task/TaskStatusBadge";
import { EditTaskButton } from "@/components/task/EditTaskButton";
import { TaskDeleteButton } from "@/components/task/TaskDeleteButton";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const accessToken = await getAccessTokenFromCookies();

  const [task, comments] = await Promise.all([
    apiFetch<TaskDetail>(`/tasks/${id}`, { accessToken }),
    apiFetch<PaginatedResult<TaskCommentSummary>>(`/tasks/${id}/comments?pageSize=50`, { accessToken }),
  ]);

  const canManage = task.createdByUserId === user.id || hasAnyRole(user, ["SUPER_ADMIN", "ADMIN", "MANAGER"]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/tasks" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to tasks
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-[var(--color-ink)]">{task.title}</h1>
            {task.description && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{task.description}</p>}
          </div>
          {canManage ? (
            <TaskStatusSelect taskId={task.id} status={task.status} />
          ) : (
            <TaskStatusBadge status={task.status} />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <TaskPriorityBadge priority={task.priority} />
          {task.dueDate && <span className="text-[var(--color-ink-muted)]">Due {formatDate(task.dueDate)}</span>}
          <span className="text-[var(--color-ink-muted)]">Created {formatDate(task.createdAt)}</span>
        </div>

        {canManage && (
          <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
            <EditTaskButton task={task} />
            <TaskDeleteButton taskId={task.id} />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignees</CardTitle>
        </CardHeader>
        <TaskAssigneesEditor taskId={task.id} assignees={task.assignees} />
      </Card>

      {task.subtasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subtasks</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {task.subtasks.map((subtask) => (
              <Link
                key={subtask.id}
                href={`/tasks/${subtask.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-subtle)]"
              >
                {subtask.title}
                <TaskStatusBadge status={subtask.status} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <TaskAttachments taskId={task.id} attachments={task.attachments} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <TaskComments taskId={task.id} comments={comments.items} />
      </Card>
    </div>
  );
}
