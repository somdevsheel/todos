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

**What exists today (Phase 1):** the NestJS API (REST only — no WebSocket gateway, no worker yet), PostgreSQL with the complete schema, and the Next.js web app, all running locally via `docker-compose.dev.yml`. Nothing here has been deployed to Lightsail, Vercel, or any live domain — see [DEPLOYMENT.md](./DEPLOYMENT.md), [LIGHTSAIL.md](./LIGHTSAIL.md), [VERCEL.md](./VERCEL.md).

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
| **3. Calendar** | Events, participants/RSVP, month/week/day/agenda views, the reminder worker (BullMQ) for task due-dates and event reminders | Not started — schema exists (`Event`, `EventParticipant`, `Reminder`); see `apps/api/src/modules-future/{events,reminders}/README.md` |
| **4. FCM** | Firebase integration, device-token lifecycle beyond registration, push delivery, notification preferences becoming user-editable | Not started — schema exists (`UserDevice` register/list/delete already works; `NotificationPreference` is schema-only); see [FCM.md](./FCM.md) |
| **5. Chat** | Conversations/channels, WebSocket gateway, typing/presence/read-receipts, @mentions, chat notifications (online → WS, offline → push, never both) | Not started — schema exists (`Conversation`, `ConversationMember`, `Message`, `MessageAttachment`); see [CHAT.md](./CHAT.md) and `apps/api/src/modules-future/chat/README.md` |
| **6. Android** | Real React Native screens (auth, tasks, events, chat), FCM, deep links, device registration/logout | Not started — `apps/mobile` is a placeholder screen only; see [ANDROID.md](./ANDROID.md) |
| **7. Admin** | Full employee/team/department management UI, announcements, richer audit-log UI, fine-grained permission editing | Partially started — invite form + audit log viewer exist in `/admin`; bulk management UI does not |
| **8. Production** | Docker for `workspace-worker`/`workspace-websocket`, Lightsail NGINX config, Vercel deployment, monitoring, backups | Not started — `docker/api.Dockerfile` + `docker-compose.dev.yml` exist for local/single-service use only; see [DEPLOYMENT.md](./DEPLOYMENT.md), [LIGHTSAIL.md](./LIGHTSAIL.md), [VERCEL.md](./VERCEL.md) |

## Multi-tenancy readiness

Every business table carries `organizationId`, and `User.email` is unique per `(organizationId, email)` rather than globally — the schema does not assume "there is exactly one organization," even though `ALLOWED_EMAIL_DOMAINS` currently only lists `arutechconsultancy.com` and the seed data creates exactly one `Organization` row. Turning this into a real multi-tenant SaaS product later means: adding an org-selection step to login (today, `AuthService.login` does a cross-org `findFirst` by email, documented as a known Phase-1 simplification in `auth.service.ts`), and building the operator-facing organization-provisioning flow — not a schema migration.
