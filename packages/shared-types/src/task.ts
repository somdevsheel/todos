export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

/** Server-side query shortcuts for the spec's named task views (§12). */
export const TASK_VIEWS = ["mine", "assigned", "created", "team", "completed", "overdue"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export interface TaskAssigneeSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface TaskSummary {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  createdByUserId: string;
  teamId?: string | null;
  departmentId?: string | null;
  parentTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  assignees: TaskAssigneeSummary[];
  commentCount: number;
  attachmentCount: number;
  subtaskCount: number;
}

export interface TaskSubtaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface TaskAttachmentSummary {
  id: string;
  file: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  };
}

export interface TaskDetail extends TaskSummary {
  subtasks: TaskSubtaskSummary[];
  attachments: TaskAttachmentSummary[];
}

export interface TaskCommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface TaskCommentSummary {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: TaskCommentAuthor;
  mentionedUserIds: string[];
}

export interface TaskStats {
  myTasks: number;
  dueToday: number;
  overdue: number;
}
