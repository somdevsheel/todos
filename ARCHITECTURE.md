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
                           v
              NestJS API container
        (REST + WebSocket gateway + BullMQ
         reminder scheduler/worker — one
         process, one container — see the
         "Phase 8" section below for why)
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

**What exists today (Phases 1–8):** the NestJS API (REST plus a real authenticated Socket.IO gateway plus a BullMQ-backed reminder scheduler/worker, all in one process — a deliberate Phase 8 decision, see below, not an unfinished split), PostgreSQL with the complete schema, FCM push code with no live Firebase project behind it yet (see FCM.md), the Next.js web app with a full real-time chat UI, an Expo/React Native Android app with real screens across auth/tasks/calendar/chat — code-complete and bundle-verified, but never run on an actual emulator/device in this environment (see ANDROID.md) — and a complete, locally-verified production Docker/CI deployment story (see below) — all running locally via `docker-compose.dev.yml`/`docker-compose.prod.yml`. Nothing here has been deployed to a real Lightsail host, Vercel, or any live domain yet — see [DEPLOYMENT.md](./DEPLOYMENT.md), [LIGHTSAIL.md](./LIGHTSAIL.md), [VERCEL.md](./VERCEL.md).

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
| **6. Android** | Real React Native screens (auth, tasks, events, chat), FCM, deep links, device registration/logout | **Code done, never run** — Expo Router navigation, secure-token auth with auto-refresh, task list/detail/create, agenda-style calendar with RSVP, real-time chat (same WebSocket ticket mechanism as web), FCM device registration, and deep-link resolution are all real. Verified via `tsc --noEmit`, ESLint, and a real `expo export --platform android` bundle build — **not** verified on an emulator/device, since none is available in this environment. **All four originally-named mobile gaps are now closed** — GROUP conversation creation, the @mention picker in task comments/chat messages, month/week/day calendar views + a native date-time picker, and a task Kanban board (a real finding here: web's own Kanban isn't drag-and-drop either, a `<select>` dropdown per card — mobile's version taps through to the existing task detail screen for status changes instead, genuine parity with web's actual design, not a substitute). A real logo is also now wired into the app icon, adaptive icon, splash screen, and the web app's favicon. See ANDROID.md's "Closed gaps" for all of it. A real EAS Build + real Firebase project setup is now in progress (see ANDROID.md's "Real device build" section) — the "never run on an emulator/device" claim above is what that section is actively working to resolve, not yet confirmed either way. See [ANDROID.md](./ANDROID.md) |
| **7. Admin** | Full employee/team/department management UI, announcements, richer audit-log UI, fine-grained permission editing | **Done** — real management UI for departments (`/admin/departments`), teams (`/teams`, `/teams/[id]` for member add/remove), and employees (`/employees/[id]` — profile, department, activate/deactivate, role assign/revoke, SUPER_ADMIN-only), a new `Announcement` model with org-wide broadcast creation that fans out a real `SYSTEM_NOTIFICATION` to every other org member, a paginated/filterable `/admin/audit-log` page (`action`/`entityType` dropdowns), and a `PermissionMatrix` UI backed by a new `PATCH /roles/:id/permissions` endpoint. All of it live-verified end-to-end against a running API: department/team/member creation, the announcement notification fan-out, role-permission edits persisting through `GET /roles`, and both audit-log filters returning correctly-scoped results. **Known simplification:** authorization everywhere is still 100% role-name-based (`@Roles('ADMIN')` against the JWT) — no guard reads `Permission`/`RolePermission`, so editing a role's permissions here persists real data but doesn't yet gate any endpoint; that wiring is future work, not part of this phase. See `apps/api/src/announcements/`, `apps/api/src/roles/roles.service.ts` |
| **8. Production** | Docker for `workspace-worker`/`workspace-websocket`, Lightsail NGINX config, Vercel deployment, monitoring, backups | **Infrastructure-as-code complete and locally verified; live deployment in progress against a real server.** Ships ONE container, not the `workspace-worker`/`workspace-websocket` split named at left — see "Phase 8: a named deviation" below for why. `docker-compose.prod.yml`, an NGINX config template, real GitHub Actions CI (build/lint/test/e2e/docker-build — genuinely runs, no cloud creds needed), a `deploy.yml` CD workflow (written, `workflow_dispatch`-only, has never successfully run — needs Lightsail secrets that don't exist), a real S3-compatible `StorageProvider` (**live-verified against a real AWS S3 bucket** — a real upload/download/delete round trip through the actual running app, not just mocks), and backup/restore scripts (run end-to-end against a real database — backed up, restored into a scratch DB, every table's row count verified identical). A real, dedicated Lightsail instance now exists (`ap-south-1`) and `LIGHTSAIL.md`'s pre-deployment checklist has been walked against it for real; the rest of the rollout (Docker install through DNS-verified HTTPS) is tracked step-by-step in `DEPLOYMENT.md`'s runbook. Still human-gated: a Vercel project, and a real Firebase project (FCM, unrelated to this phase — missing since Phase 4). See [DEPLOYMENT.md](./DEPLOYMENT.md), [LIGHTSAIL.md](./LIGHTSAIL.md), [VERCEL.md](./VERCEL.md), [BACKUPS.md](./BACKUPS.md) |

### Phase 8: a named deviation from the table above

The roadmap names `workspace-worker`/`workspace-websocket` as separate
containers. Building that split turned out to be the wrong call today,
not just an unfinished task — two independent findings, not a guess:

- `PresenceService` (`apps/api/src/websocket/presence.service.ts`) is a
  bare in-process `Map` — already a documented Phase 5 simplification.
  Splitting the WebSocket gateway into its own container would silently
  break presence/typing indicators the moment there's more than one
  replica, since two containers would each hold a different, unshared
  view of who's online. The real prerequisite (Redis pub/sub-backed
  presence) doesn't exist — building the split without it wouldn't be
  "packaging the existing worker," it'd ship a real regression.
- The reminder scheduler/worker needs no split to be safe at all: it has
  **two independent idempotency layers** — BullMQ's `jobId: reminderId`
  dedup on enqueue (`ReminderSchedulerService`), and
  `RemindersService.claim()`'s atomic
  `updateMany({where: {id, isSent: false}, data: {isSent: true}})`
  compare-and-swap before processing. Running multiple replicas of the
  *entire app* today — scheduler, processor, API, WebSocket gateway all
  together — would not double-send a reminder. There's no correctness
  reason to isolate it into its own container.

Given this is a small internal-tool deployment (one company, not a public
SaaS), a single well-resourced container — exactly how the app already
runs in dev — is the scale-appropriate choice, not premature horizontal
splitting. A same-image-different-entrypoint split for blast-radius
isolation alone (crash the worker without taking down the API) remains a
real, cheap-later option if it's ever actually needed — it needs a second
bootstrap entrypoint and its own healthcheck strategy (BullMQ has no
built-in liveness probe), real but small work, deliberately not built
this phase absent a measured reason to.

## Multi-tenancy readiness

Every business table carries `organizationId`, and `User.email` is unique per `(organizationId, email)` rather than globally — the schema does not assume "there is exactly one organization," even though `ALLOWED_EMAIL_DOMAINS` currently only lists `arutechconsultancy.com` and the seed data creates exactly one `Organization` row. Turning this into a real multi-tenant SaaS product later means: adding an org-selection step to login (today, `AuthService.login` does a cross-org `findFirst` by email, documented as a known Phase-1 simplification in `auth.service.ts`), and building the operator-facing organization-provisioning flow — not a schema migration.
