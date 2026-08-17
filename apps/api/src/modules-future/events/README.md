# events (Phase 3 — not implemented)

The `Event` and `EventParticipant` tables already exist in
`prisma/schema.prisma` — no NestJS module reads or writes them yet, and
this folder is **not** imported into `app.module.ts`.

Building this module means: CRUD + RSVP endpoints, month/week/day/agenda
calendar query support, and recurring-event handling. Pairs with
`reminders/` for event reminders. See `ARCHITECTURE.md` for the phase
roadmap.
