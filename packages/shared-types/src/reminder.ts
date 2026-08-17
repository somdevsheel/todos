/** What a Reminder points at — matches Reminder.relatedEntityType, kept as a string column for the same reason AuditLog.action is (see audit.ts). */
export const REMINDER_ENTITY_TYPES = ["TASK", "EVENT"] as const;
export type ReminderEntityType = (typeof REMINDER_ENTITY_TYPES)[number];

export interface ReminderSummary {
  id: string;
  relatedEntityType: ReminderEntityType;
  relatedEntityId: string;
  taskId?: string | null;
  eventId?: string | null;
  remindAt: string;
  message?: string | null;
  isSent: boolean;
  createdAt: string;
  /** Denormalized label for the "My reminders" UI so it doesn't need a second fetch per row. */
  relatedEntityTitle: string;
}
