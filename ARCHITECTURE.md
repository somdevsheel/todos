# Architecture

## System overview (target, end state)

```text
                         USERS
                           |
          +----------------+----------------+
          |                                 |
          v                                 v
 Desktop/Mobile Browser                  Android
          |                                 |
          v                                 |
workspace.arutechconsultancy.com            |
          |                                 |
       Vercel (Next.js)                     |
          |                                 |
          +----------------+----------------+
                           |
                           v
                 api.arutechconsultancy.com
                           |
                           v
                    AWS Lightsail
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
     NestJS API        WebSocket           Worker
        |                  |                  |
        +------------------+------------------+
                           |
                  +--------+--------+
                  |                 |
                  v                 v
              PostgreSQL          Redis
                                     |
                                     v
                          Notification Queue (BullMQ)
                                     |
                                     v
                                    FCM
                                     |
                                     v
                                 Android
```

**What exists today (Phases 1–6):** the NestJS API (REST plus a real authenticated Socket.IO gateway — still one process, not yet split into its own `workspace-websocket` container, see Phase 8), PostgreSQL with the complete schema, a BullMQ-backed reminder worker running *inside* the same API process (see Phase 8), FCM push code with no live Firebase project behind it yet (see FCM.md), the Next.js web app with a full real-time chat UI, and an Expo/React Native Android app with real screens across auth/tasks/calendar/chat — code-complete and bundle-verified, but never run on an actual emulator/device in this environment (see ANDROID.md) — all running locally via `docker-compose.dev.yml`. Nothing here has been deployed to Lightsail, Vercel, or any live domain — see [DEPLOYMENT.md](./DEPLOYMENT.md), [LIGHTSAIL.md](./LIGHTSAIL.md), [VERCEL.md](./VERCEL.md).

## Why a monorepo

`apps/api`, `apps/web`, and `apps/mobile` all consume the same domain types (`packages/shared-types`) and talk to the same backend contract. A single pnpm workspace keeps those types from drifting between clients without needing a published npm package or codegen step. `pnpm --filter` scopes installs/builds per app, so `apps/api`'s Docker image never pulls in `apps/web`'s or `apps/mobile`'s dependencies.

## Why these specific technology choices

- **NestJS over a lighter framework**: the spec requires many cross-cutting concerns (RBAC guards, org-scoping, audit logging, rate limiting, DTO validation) applied consistently across a growing number of modules — Nest's DI + decorator model is what keeps that from becoming copy-pasted boilerplate per route.
- **Prisma over a query builder**: strong TypeScript types generated from one schema file, used identically by services and by `seed.ts`; migrations are reviewable SQL, not hidden ORM magic.
- **httpOnly-cookie BFF over client-stored JWT** (web): eliminates XSS token theft as an attack vector for the web client. The API itself stays transport-agnostic (tokens in the JSON body), which is what lets the future Android app use a completely different token-storage strategy (secure device storage) against the exact same endpoints. See [AUTHENTICATION.md](./AUTHENTICATION.md).
- **Argon2id over bcrypt**: OWASP's current recommendation for password hashing; the `argon2` package is used with explicit memory/time/parallelism cost parameters rather than defaults.
- **A hybrid RBAC model** (seeded `Role`/`Permission` tables + a `UserRole` join, with role names cached in the JWT): keeps authorization checks cheap (no DB hit per request) while keeping the roster of roles data-driven, not a hardcoded enum, so a fifth role can be added later without a code change to the guard.

## Module boundaries (apps/api)

Every module owns its own controller/service/DTOs and is registered once in `app.module.ts`. Global cross-cutting behavior lives in `common/` (guards, decorators, interceptors, filters) and is composed, not duplicated, per module:

```
JwtAuthGuard  →  RolesGuard  →  OrgScopeGuard
(authenticate)   (has role?)    (owns this specific resource?)
```

`audit/` exports both an `AuditService` (called directly for flows with branching audit outcomes, like login failure reasons) and an `AuditInterceptor` + `@Audit()` decorator (for straightforward CRUD mutations that just need a row written on success). See the docstring on `AuditInterceptor` for why it's registered as the *innermost* global interceptor.

`config/` validates every environment variable through a single zod schema at bootstrap (`env.schema.ts`) — a missing or malformed required variable aborts startup before the HTTP listener opens, rather than failing on the first request that touches it.

## The 8-phase roadmap

| Phase | Scope | Status |
|---|---|---|
| **1. Foundation** | Monorepo, full DB schema, auth (invitation/login/refresh/reset), RBAC, orgs/departments/teams, audit log, health checks, responsive web shell, notification center (read/mark-read) | **Done** — this repo |
| **2. Tasks** | Task CRUD, assignment, status/priority, comments, attachments, checklists, list/kanban views, task-assignment notifications | **Done** — full CRUD, assignment authorization, comments with explicit @mentions, subtasks (via `parentTaskId`), a provider-abstracted file storage layer (local-disk today), and the first real notification producers (`TASK_ASSIGNED`/`TASK_COMMENTED`/`TASK_MENTIONED`/`TASK_COMPLETED`) — see `apps/api/src/tasks/`, `apps/api/src/task-comments/`, `apps/api/src/files/` |
| **3. Calendar** | Events, participants/RSVP, month/week/day/agenda views, the reminder worker (BullMQ) for task due-dates and event reminders | **Done** — full event CRUD, RSVP, a "my calendar" (creator-or-participant) default scope plus an optional team-calendar mode, and a real BullMQ reminder worker (`ReminderSchedulerService` + `ReminderProcessor`, running in-process — see Phase 8) producing `TASK_DUE_SOON`/`TASK_OVERDUE`/`EVENT_REMINDER` notifications, idempotent via an atomic claim on top of the DB unique constraint. **Known simplifications:** no recurring events (schema has no RRULE field — a future migration, not built here) and `EVENT_STARTING` stays reserved/unimplemented (a separate "starting now" ping, distinct from a user-set reminder). See `apps/api/src/events/`, `apps/api/src/reminders/` |
| **4. FCM** | Firebase integration, device-token lifecycle beyond registration, push delivery, notification preferences becoming user-editable | **Code done, infrastructure isn't** — `FcmModule` wraps `firebase-admin`, `NotificationsService` fans every notification out through it, dead tokens self-deactivate, and `NotificationPreference` is a real user-editable API + Settings UI (PUSH channel only — see NOTIFICATIONS.md). **What's actually missing:** a real Firebase project — requires a human with account access, not provisionable from this repo — so `FcmService` runs in its documented disabled/no-op state everywhere this code has run, including here; no live push send has been verified. See [FCM.md](./FCM.md) |
| **5. Chat** | Conversations/channels, WebSocket gateway, typing/presence/read-receipts, @mentions, chat notifications (online → WS, offline → push, never both) | **Done** — full conversation/message CRUD, an authenticated Socket.IO gateway (ticket-based auth bridging the httpOnly-cookie session — see AUTHENTICATION.md), typing indicators, presence, read receipts that stay current while a thread is open, and @mentions via the same explicit-picker model as `TaskComment`. The online/push dedup rule is real, not aspirational — live-verified against the actual gateway, not just mocked unit tests (see CHAT.md's "Verification"). **Known simplifications:** no auto-provisioned org-wide default channel, presence/typing state is in-process (single-instance topology, same as Phase 3's reminder worker), no chat attachment upload UI yet. See [CHAT.md](./CHAT.md) |
| **6. Android** | Real React Native screens (auth, tasks, events, chat), FCM, deep links, device registration/logout | **Code done, never run** — Expo Router navigation, secure-token auth with auto-refresh, task list/detail/create, agenda-style calendar with RSVP, real-time chat (same WebSocket ticket mechanism as web), FCM device registration, and deep-link resolution are all real. Verified via `tsc --noEmit`, ESLint, and a real `expo export --platform android` bundle build — **not** verified on an emulator/device, since none is available in this environment. **Known gaps:** no GROUP conversation creation, no month/week/day calendar views or native date-time picker, no task Kanban board, no @mention picker on mobile (plain text only). See [ANDROID.md](./ANDROID.md) |
| **7. Admin** | Full employee/team/department management UI, announcements, richer audit-log UI, fine-grained permission editing | **Done** — real management UI for departments (`/admin/departments`), teams (`/teams`, `/teams/[id]` for member add/remove), and employees (`/employees/[id]` — profile, department, activate/deactivate, role assign/revoke, SUPER_ADMIN-only), a new `Announcement` model with org-wide broadcast creation that fans out a real `SYSTEM_NOTIFICATION` to every other org member, a paginated/filterable `/admin/audit-log` page (`action`/`entityType` dropdowns), and a `PermissionMatrix` UI backed by a new `PATCH /roles/:id/permissions` endpoint. All of it live-verified end-to-end against a running API: department/team/member creation, the announcement notification fan-out, role-permission edits persisting through `GET /roles`, and both audit-log filters returning correctly-scoped results. **Known simplification:** authorization everywhere is still 100% role-name-based (`@Roles('ADMIN')` against the JWT) — no guard reads `Permission`/`RolePermission`, so editing a role's permissions here persists real data but doesn't yet gate any endpoint; that wiring is future work, not part of this phase. See `apps/api/src/announcements/`, `apps/api/src/roles/roles.service.ts` |
| **8. Production** | Docker for `workspace-worker`/`workspace-websocket`, Lightsail NGINX config, Vercel deployment, monitoring, backups | Not started — `docker/api.Dockerfile` + `docker-compose.dev.yml` exist for local/single-service use only; see [DEPLOYMENT.md](./DEPLOYMENT.md), [LIGHTSAIL.md](./LIGHTSAIL.md), [VERCEL.md](./VERCEL.md) |

## Multi-tenancy readiness

Every business table carries `organizationId`, and `User.email` is unique per `(organizationId, email)` rather than globally — the schema does not assume "there is exactly one organization," even though `ALLOWED_EMAIL_DOMAINS` currently only lists `arutechconsultancy.com` and the seed data creates exactly one `Organization` row. Turning this into a real multi-tenant SaaS product later means: adding an org-selection step to login (today, `AuthService.login` does a cross-org `findFirst` by email, documented as a known Phase-1 simplification in `auth.service.ts`), and building the operator-facing organization-provisioning flow — not a schema migration.
