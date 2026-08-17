# API

**Status: partial.** This documents the conventions every endpoint follows today; a full endpoint-by-endpoint reference is a later-phase deliverable once Tasks/Events/Chat add the bulk of the surface area. For now, the source of truth for available endpoints is the controllers under `apps/api/src/*/`.

## Conventions

- Base path: `/api/v1` (`API_GLOBAL_PREFIX`).
- Every response is wrapped in a standard envelope by `TransformInterceptor`/`HttpExceptionFilter`:

  ```json
  // success
  { "success": true, "data": { ... } }

  // error — never includes a stack trace, in any environment
  { "success": false, "error": { "code": "TASK_NOT_FOUND", "message": "Task not found" } }
  ```

- Pagination: `?page=1&pageSize=20` (`PaginationQueryDto`), responses shaped as `{ items: T[], meta: { page, pageSize, totalItems, totalPages } }`.
- All request bodies are validated via `class-validator` DTOs with `whitelist: true, forbidNonWhitelisted: true` — unknown fields are rejected, not silently dropped or accepted.
- Auth: `Authorization: Bearer <accessToken>` (see [AUTHENTICATION.md](./AUTHENTICATION.md)). Public routes are explicitly annotated `@Public()`.
- File responses are the one exception to the JSON envelope: `GET /files/:id` streams raw bytes with a real `Content-Type`/`Content-Disposition` (`TransformInterceptor` special-cases `StreamableFile` — see its docstring).

## Implemented route groups

- **Phase 1**: `/auth`, `/users`, `/organizations`, `/departments`, `/teams`, `/roles`, `/permissions`, `/audit-logs`, `/notifications`, `/user-devices`, `/health`.
- **Phase 2**: `/tasks` (including `/tasks/stats`, `/tasks/:id/status`, `/tasks/:id/assignees`, `/tasks/:id/attachments`), `/tasks/:id/comments` (task-comments module, nested — a comment always belongs to exactly one task), `/files` (upload via multipart `POST /files`, `GET /files/:id` to download, `DELETE /files/:id`).
- **Phase 3**: `/events` (including `/events/:id/rsvp`, `/events/:id/participants`) — `GET /events` is a bounded `?from=&to=` date-range query, not a paginated list (see ARCHITECTURE.md), `/reminders` (`GET` returns the caller's own unsent reminders; the BullMQ worker that fires them has no HTTP surface — see NOTIFICATIONS.md).
- **Phase 4**: `/notifications/preferences` (`GET`/`PATCH`, PUSH channel only — see NOTIFICATIONS.md). No new route group for FCM itself — `FcmService` isn't HTTP-facing, it's invoked internally by `NotificationsService`; see FCM.md.
- **Phase 5**: `/conversations` (including `/conversations/:id/read`, `/conversations/:id/members`) and nested `/conversations/:id/messages`. Plus one non-REST addition: `/auth/ws-ticket` (`POST`, behind the normal auth guard) mints the short-lived connection ticket the browser uses to open the chat WebSocket directly against the API — see AUTHENTICATION.md's "WebSocket authentication" section. The gateway itself has no REST surface.

## Not yet implemented

`/search` — see [ARCHITECTURE.md](./ARCHITECTURE.md) for which phase it lands in.
