# Chat

**Status: not implemented.** This is the Phase 5 plan.

## What exists today

The full schema: `Conversation` (`type: DIRECT | GROUP`), `ConversationMember` (`lastReadAt` for unread counts), `Message` (soft-deletable, editable), `MessageAttachment`. No controller, service, or WebSocket gateway reads or writes them — `apps/api/src/modules-future/chat/README.md` marks the folder as not registered in `app.module.ts`.

## Plan

- An authenticated Socket.IO gateway under `apps/api/src/websocket/` (not yet created), verifying the same JWT access token used by REST — the WebSocket connection's identity is never trusted from an unauthenticated handshake payload.
- REST endpoints for conversation/message history with pagination (chat must never load thousands of messages at once — infinite scroll from day one).
- Events: `message:new`, `message:updated`, `message:deleted`, `typing:start/stop`, `presence:online/offline`, `notification:new`.
- Read receipts via `ConversationMember.lastReadAt`; unread counts derived from it, not a separately-maintained counter that can drift.
- @mentions: detected server-side on message create, resolved to a `Notification` row + (once Phase 4 exists) a push, deep-linking to the specific message.
- Duplicate-notification avoidance: if the recipient's socket is connected and actively subscribed to that conversation, skip the push notification — the in-app delivery already reached them. This logic belongs in the gateway, not duplicated per notification type.

Team channels (`#general`, `#development`, etc.) are `Conversation` rows with `type: GROUP` and a `name` — no separate "channel" table; a channel is just a group conversation with organization-wide default membership handled at creation time.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for phasing and [NOTIFICATIONS.md](./NOTIFICATIONS.md) for how chat notifications compose with the rest of the notification system.
