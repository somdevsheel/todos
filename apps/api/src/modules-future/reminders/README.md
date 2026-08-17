# reminders (Phase 3 — not implemented)

The `Reminder` table already exists in `prisma/schema.prisma`, including a
unique constraint on `(userId, relatedEntityType, relatedEntityId,
remindAt)` specifically so the future BullMQ worker's job retries can
never send the same reminder twice.

Building this module means: a `workspace-worker` process (see
DEPLOYMENT.md), a Redis-backed BullMQ queue, a scheduler that enqueues due
reminders, and a notification worker that consumes the queue and calls the
`notifications` module + FCM. See `ARCHITECTURE.md` for the phase roadmap.
