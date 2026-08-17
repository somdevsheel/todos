# Notifications

**Status: the notification center is fully real, both read and write sides. FCM push delivery is still not built.**

## What exists today

- `Notification` table (`organizationId, userId, type, title, body, data, isRead, readAt`) with real endpoints: `GET /notifications` (paginated), `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
- `NotificationsService.create()`/`createMany()` (added in Phase 2) — the write side. First real producer: `apps/api/src/tasks/tasks.service.ts` and `apps/api/src/task-comments/task-comments.service.ts`. Never throws — a failed notification write is logged, not allowed to fail the business operation that triggered it (same philosophy as `AuditService.log()`).
- Real notification types in production use today (`packages/shared-types/src/notification.ts`'s `NOTIFICATION_TYPES`): `TASK_ASSIGNED` (assignment — never sent to the actor who did the assigning), `TASK_COMMENTED` (sent to the task's creator + assignees, excluding the comment's own author), `TASK_MENTIONED` (sent to explicitly `mentionedUserIds` instead of the generic `TASK_COMMENTED` — a mentioned participant gets the more specific one, not both), `TASK_COMPLETED` (sent to the creator when someone *else* completes their task).
- A working notification center UI at `/notifications` in the web app (mark one/all as read, unread badge on the dashboard) — verified receiving real rows from real task activity, not just Phase 1's empty-state screenshot.
- `NotificationPreference` table exists (`userId, channel, category, enabled`) but has no API yet — the Settings page shows a "coming soon" note where per-category toggles will live.

## The pipeline, as actually built

```
Business Event (task assigned, @mentioned in a comment, task completed)
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

Remaining reserved types (`TASK_DUE_SOON`/`TASK_OVERDUE` for Phase 3's reminder worker, `EVENT_*` for Phase 3, `NEW_MESSAGE`/`MESSAGE_MENTION` for Phase 5) are documented as comments in `NOTIFICATION_TYPES` so the naming doesn't have to be re-decided later.

Duplicate-notification avoidance for chat specifically (don't push a message to someone actively viewing that conversation) is a Phase 5 concern — see [CHAT.md](./CHAT.md). Task notifications don't have an equivalent "actively viewing" concept to dedupe against yet.

See [FCM.md](./FCM.md) for the push-delivery side specifically, and [ARCHITECTURE.md](./ARCHITECTURE.md) for phasing.
