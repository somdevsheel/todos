/**
 * Notification "type" values, stored as a plain string column (see
 * `Notification.type` in DATABASE.md — same not-a-Postgres-enum reasoning
 * as AUDIT_ACTIONS) so later phases can add types without a migration.
 * Only the ones an actual producer exists for are listed as real entries;
 * the rest of the spec's §19 list is commented as a reminder of what's
 * still to come, so the eventual name doesn't have to be guessed again.
 */
export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_COMMENTED: "TASK_COMMENTED",
  TASK_MENTIONED: "TASK_MENTIONED",
  TASK_COMPLETED: "TASK_COMPLETED",
  // Phase 3 — both produced by the same mechanism: a fired Reminder row
  // attached to a task (see reminders/reminder.processor.ts), which picks
  // one or the other based on whether the task's dueDate has already
  // passed by the time the reminder fires.
  TASK_DUE_SOON: "TASK_DUE_SOON",
  TASK_OVERDUE: "TASK_OVERDUE",
  EVENT_CREATED: "EVENT_CREATED",
  EVENT_UPDATED: "EVENT_UPDATED",
  EVENT_CANCELLED: "EVENT_CANCELLED",
  EVENT_REMINDER: "EVENT_REMINDER",
  // Phase 5 — see MessagesService: MESSAGE_MENTION takes priority over the
  // generic NEW_MESSAGE for a recipient explicitly @mentioned, same split
  // as TASK_MENTIONED vs. TASK_COMMENTED. Neither fires at all for a
  // recipient currently "focused" on that conversation over the WebSocket
  // — see PresenceService / CHAT.md's online-vs-push rule.
  NEW_MESSAGE: "NEW_MESSAGE",
  MESSAGE_MENTION: "MESSAGE_MENTION",
  // Reserved, no producer yet:
  // EVENT_STARTING                        — a "starting now" ping distinct
  //                                          from a user-set Reminder; not
  //                                          built in Phase 3.
  // TEAM_INVITATION / ACCOUNT_INVITATION / SYSTEM_NOTIFICATION
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Groups every NotificationType into the coarser buckets a user actually
 * wants to toggle in Settings (see NotificationPreference in DATABASE.md) —
 * nobody wants a per-type checkbox list. New types must be added here too;
 * there's no fallback default, so forgetting is a compile error wherever
 * this map is used exhaustively.
 */
export const NOTIFICATION_CATEGORIES = ["tasks", "reminders", "events", "chat"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  tasks: "Tasks",
  reminders: "Reminders",
  events: "Calendar events",
  chat: "Chat",
};

export const NOTIFICATION_TYPE_CATEGORY: Record<NotificationType, NotificationCategory> = {
  TASK_ASSIGNED: "tasks",
  TASK_COMMENTED: "tasks",
  TASK_MENTIONED: "tasks",
  TASK_COMPLETED: "tasks",
  TASK_DUE_SOON: "reminders",
  TASK_OVERDUE: "reminders",
  EVENT_REMINDER: "reminders",
  EVENT_CREATED: "events",
  EVENT_UPDATED: "events",
  EVENT_CANCELLED: "events",
  NEW_MESSAGE: "chat",
  MESSAGE_MENTION: "chat",
};
