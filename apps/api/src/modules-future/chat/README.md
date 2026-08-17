# chat (Phase 5 — not implemented)

The `Conversation`, `ConversationMember`, `Message`, and
`MessageAttachment` tables already exist in `prisma/schema.prisma` — no
NestJS module or WebSocket gateway reads or writes them yet, and this
folder is **not** imported into `app.module.ts`.

Building this module means: an authenticated Socket.IO gateway (`ws/`),
conversation/message REST endpoints for history + pagination, typing
indicators, presence, read receipts, @mentions, and the
online-vs-push notification decision described in CHAT.md. See
ARCHITECTURE.md for the phase roadmap.
