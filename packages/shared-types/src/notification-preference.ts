import type { NotificationCategory } from "./notification";

/** Mirrors the Prisma `NotificationChannel` enum — not otherwise represented in shared-types until Phase 4 needed a settings UI to iterate over it. */
export const NOTIFICATION_CHANNELS = ["EMAIL", "PUSH", "IN_APP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface NotificationPreferenceItem {
  channel: NotificationChannel;
  category: NotificationCategory;
  /** Defaults to true when no NotificationPreference row exists — see NotificationsService.getPreferences(). */
  enabled: boolean;
}
