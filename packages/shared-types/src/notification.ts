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
  // Reserved, no producer yet:
  // EVENT_STARTING                        — a "starting now" ping distinct
  //                                          from a user-set Reminder; not
  //                                          built in Phase 3.
  // NEW_MESSAGE / MESSAGE_MENTION          — Phase 5
  // TEAM_INVITATION / ACCOUNT_INVITATION / SYSTEM_NOTIFICATION
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
