# Notifications

**Status: the notification center is fully real, both read and write sides, now including a real BullMQ-backed reminder worker (Phase 3). FCM push delivery is still not built.**

## What exists today

- `Notification` table (`organizationId, userId, type, title, body, data, isRead, readAt`) with real endpoints: `GET /notifications` (paginated), `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
- `NotificationsService.create()`/`createMany()` (added in Phase 2) — the write side. Producers: `apps/api/src/tasks/tasks.service.ts`, `apps/api/src/task-comments/task-comments.service.ts`, `apps/api/src/events/events.service.ts`, and `apps/api/src/reminders/reminder.processor.ts` (Phase 3). Never throws — a failed notification write is logged, not allowed to fail the business operation that triggered it (same philosophy as `AuditService.log()`).
- Real notification types in production use today (`packages/shared-types/src/notification.ts`'s `NOTIFICATION_TYPES`): `TASK_ASSIGNED` (assignment — never sent to the actor who did the assigning), `TASK_COMMENTED` (sent to the task's creator + assignees, excluding the comment's own author), `TASK_MENTIONED` (sent to explicitly `mentionedUserIds` instead of the generic `TASK_COMMENTED` — a mentioned participant gets the more specific one, not both), `TASK_COMPLETED` (sent to the creator when someone *else* completes their task).
- Phase 3 adds: `EVENT_CREATED` (an invite — sent on event creation and on `addParticipant`, same reuse pattern as `TASK_ASSIGNED`), `EVENT_UPDATED` (any edit, sent to every other participant — unlike `TasksService.update`, which doesn't notify on a plain edit, every invitee genuinely needs to know a meeting's time/place changed), `EVENT_CANCELLED` (event deleted), and `EVENT_REMINDER`/`TASK_DUE_SOON`/`TASK_OVERDUE` — all three produced by the same mechanism, a fired `Reminder` row (see "The reminder worker" below).
- A working notification center UI at `/notifications` in the web app (mark one/all as read, unread badge on the dashboard) — verified receiving real rows from real task activity, not just Phase 1's empty-state screenshot.
- `NotificationPreference` table exists (`userId, channel, category, enabled`) but has no API yet — the Settings page shows a "coming soon" note where per-category toggles will live.

## The pipeline, as actually built

```
Business Event (task assigned, @mentioned in a comment, task completed,
                 event created/updated/cancelled, a Reminder firing)
      |
      v
NotificationsService.create()/createMany()   — writes to Postgres, never throws
      |
      v
Notification center (GET /notifications, PATCH .../read) — already consuming real rows
      |
      +---> WebSocket push if the user is online (Phase 5 — not built)
      |
      +---> FCM push if appropriate (Phase 4 — not built) — will respect NotificationPreference
```

PostgreSQL is the notification database — FCM is a delivery channel, never the source of truth. Phase 1 built the read/mark-read API and UI ahead of any producer specifically so this pipeline's two ends (producer, consumer) could be verified independently; Phase 2 proved the join works end-to-end (verified via `apps/api/test/tasks.e2e-spec.ts` and manually: assigning a task produces a real row the assignee's notification center shows).

## The reminder worker (Phase 3)

`Reminder` rows are user-created (`POST /reminders`, scoped to a task or event the caller can already see — no implicit/default reminders). A `ReminderSchedulerService` (`apps/api/src/reminders/reminder-scheduler.service.ts`) runs `@Cron(EVERY_MINUTE)` inside the API process today (splitting it into the dedicated `workspace-worker` container is a Phase 8 packaging concern, not a code change — see DEPLOYMENT.md), finds due reminders, and hands each to a BullMQ queue (`jobId: reminder.id`, so re-enqueueing an already-in-flight reminder is a no-op). `ReminderProcessor` consumes the job, atomically claims the reminder (`RemindersService.claim()` — an `updateMany` with `isSent: false` in its WHERE clause, so even two concurrent delivery attempts can't double-send), and writes exactly one notification: `TASK_DUE_SOON` or `TASK_OVERDUE` depending on whether the task's `dueDate` has already passed at fire time, or `EVENT_REMINDER` for an event reminder.

Remaining reserved type (`EVENT_STARTING` — a "starting now" ping distinct from a user-set reminder) is documented as a comment in `NOTIFICATION_TYPES` so the naming doesn't have to be re-decided later; it isn't built.

Duplicate-notification avoidance for chat specifically (don't push a message to someone actively viewing that conversation) is a Phase 5 concern — see [CHAT.md](./CHAT.md). Task notifications don't have an equivalent "actively viewing" concept to dedupe against yet.

See [FCM.md](./FCM.md) for the push-delivery side specifically, and [ARCHITECTURE.md](./ARCHITECTURE.md) for phasing.
