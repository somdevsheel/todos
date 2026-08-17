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
  // Reserved, no producer yet:
  // TASK_DUE_SOON / TASK_OVERDUE          — Phase 3 reminder worker
  // EVENT_CREATED / EVENT_UPDATED /
  //   EVENT_CANCELLED / EVENT_REMINDER /
  //   EVENT_STARTING                       — Phase 3
  // NEW_MESSAGE / MESSAGE_MENTION          — Phase 5
  // TEAM_INVITATION / ACCOUNT_INVITATION / SYSTEM_NOTIFICATION
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
