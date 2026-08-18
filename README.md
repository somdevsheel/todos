# Arutech Workspace

Internal collaboration platform for **Arutech Consultancy Services LLP** — company-only authentication, RBAC, task management, calendar, real-time chat, and push-notification-driven workflows, built as the foundation for a future multi-tenant SaaS product.

**This repository implements all 8 phases of its roadmap** (Foundation, Tasks, Calendar, FCM, Chat, Android, Admin, Production). See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full plan and exactly what is/isn't built yet. Phases 1–5 and 7 are real and fully working end-to-end locally — not a prototype — with one caveat: Phase 4's push-delivery *code* is done and tested, but no real Firebase project exists to send a live push through yet (see [FCM.md](./FCM.md) — that step requires a human with account access). **Phase 6 (Android) carries a bigger caveat**: the app is code-complete (real auth/tasks/calendar/chat screens, verified via `tsc`, ESLint, and a real Metro bundle export) but has never run on an actual emulator or device — none was available in this environment (see [ANDROID.md](./ANDROID.md)). **Phase 8 (Production) is infrastructure-as-code, real and locally verified** — a real Docker build booted in production mode with a genuine database migration and passing health check, real CI, and a real backup/restore cycle — but has never touched an actual live server, domain, or Vercel project; that step needs a human with real account access (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

## What's built

- Invitation-only authentication (Argon2id, JWT access + rotating refresh tokens, company-domain enforcement) — see [AUTHENTICATION.md](./AUTHENTICATION.md)
- RBAC (SUPER_ADMIN / ADMIN / MANAGER / EMPLOYEE), organizations, departments, teams
- Full task management: CRUD, assignment (with authorization rules), status/priority, comments with explicit @mentions, subtasks, file attachments (provider-abstracted storage, local-disk today) — list and Kanban views
- Full calendar: event CRUD, RSVP, month/week/day/agenda views, a "my calendar" default scope with an optional team-calendar mode, and a real BullMQ reminder worker (running in-process — see ARCHITECTURE.md's Phase 8 note) that turns a user-set reminder into a `TASK_DUE_SOON`/`TASK_OVERDUE`/`EVENT_REMINDER` notification, idempotently
- Real-time chat: direct + group conversations, an authenticated Socket.IO gateway (ticket-based auth that keeps the real session JWT httpOnly — see [AUTHENTICATION.md](./AUTHENTICATION.md)), typing indicators, presence, read receipts, and @mentions, with an online/push notification-dedup rule that's been live-verified against the actual gateway — see [CHAT.md](./CHAT.md)
- Real notifications: task assignment/comments/mentions/completion, event invites/updates/cancellations, fired reminders, and new/mentioned chat messages all produce real rows in the notification center, not just placeholders — and fan out to FCM push (gracefully disabled without real Firebase credentials — see [FCM.md](./FCM.md)), with user-editable per-category push preferences in Settings
- Audit logging, health checks, centralized error handling
- A responsive Next.js web app: login/invitation/password-reset flows, role-aware dashboard with live task/event/message stats, task list/Kanban/detail pages, a full calendar UI, a real-time chat UI, employee/team directories, and a working notification center with editable push preferences
- An Expo/React Native Android app: real login/tasks/agenda-calendar/chat screens against the same API, secure on-device token storage, FCM device registration, and deep-link routing — code-complete and bundle-verified, never run on a device in this environment — see [ANDROID.md](./ANDROID.md)
- Full admin tooling: employee/team/department management UI (not just directories — create/edit/delete, member add/remove, activate/deactivate, role assign/revoke), org-wide announcements that fan out real notifications, a filterable/paginated audit log, and a fine-grained permission-editing UI for roles (persists real data; doesn't gate any endpoint yet — authorization is still role-name-based, see [DATABASE.md](./DATABASE.md))
- A real production deployment story: a `docker-compose.prod.yml` built and booted end-to-end in this environment (real Postgres/Redis, a real database migration, a passing health check, all in actual `NODE_ENV=production` mode), an NGINX config template, GitHub Actions CI that genuinely runs (build/lint/test/e2e/docker-build, no cloud credentials needed), a real S3-compatible file storage backend (tested against mocks, off by default), and backup/restore scripts run for real against a live database — see [DEPLOYMENT.md](./DEPLOYMENT.md) and [BACKUPS.md](./BACKUPS.md)
- The **full database schema** for the remaining spec surface — correct, indexed, and ready — see [DATABASE.md](./DATABASE.md)

## Monorepo layout

```
apps/
  api/      NestJS backend (REST API + an in-process BullMQ reminder worker + an authenticated Socket.IO chat gateway)
  web/      Next.js frontend (App Router, Tailwind, responsive desktop/tablet/mobile)
  mobile/   Expo/React Native Android app (real screens since Phase 6 — never run on-device here, see ANDROID.md)
packages/
  shared-types/   TypeScript types/constants shared by api + web (and later, mobile)
docker/
  docker-compose.dev.yml   local Postgres + Redis + MailHog
  api.Dockerfile           production image for apps/api
```

## Prerequisites

- Node.js 20.x (see `.nvmrc`)
- pnpm 9.x (`corepack enable` will install it automatically from `packageManager` in `package.json`)
- Docker + Docker Compose

## Local development

```bash
# 1. Install dependencies for every workspace
pnpm install

# 2. Copy environment files
cp .env.example .env               # used by docker-compose.dev.yml
cp .env.example apps/api/.env      # used by the NestJS app
cp .env.example apps/web/.env.local  # used by Next.js (only NEXT_PUBLIC_*/API_INTERNAL_URL matter here)

# 3. Start Postgres + Redis + MailHog (isolated compose project "arutech-workspace")
pnpm docker:dev:up
# MailHog UI (view invitation/reset emails): http://localhost:8095

# 4. Build shared types once
pnpm --filter @arutech/shared-types build

# 5. Set up the database
pnpm --filter @arutech/api prisma:generate
pnpm --filter @arutech/api prisma:migrate     # creates all tables
pnpm --filter @arutech/api prisma:seed        # org, roles, departments, dev users

# 6. Run the API and web app (separate terminals)
pnpm dev:api     # http://localhost:4000/api/v1
pnpm dev:web     # http://localhost:3000
```

Then open http://localhost:3000/login. Seeded dev accounts (see `apps/api/prisma/seed.ts` — **never used in production**):

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | hello@arutechconsultancy.com | `ArutechDev#2026` |
| ADMIN | priya.admin@arutechconsultancy.com | `ArutechDev#2026` |
| MANAGER | kajal.manager@arutechconsultancy.com | `ArutechDev#2026` |
| EMPLOYEE | rahul.dev@arutechconsultancy.com | `ArutechDev#2026` |
| EMPLOYEE | anita.ml@arutechconsultancy.com | `ArutechDev#2026` |

To try the full invitation flow: sign in as an ADMIN/SUPER_ADMIN, go to **Admin → Invite an employee**, submit a `@arutechconsultancy.com` address, then open the email in MailHog (http://localhost:8095) and click the link.

To try tasks: go to **Tasks → New task**, assign it to another seeded user, then sign in as that user to see the assignment notification and the task on their **My Tasks** view. Comment with an @mention to see a second notification arrive for the mentioned person, and attach a file to see the local-disk upload/download round trip.

### Android app

```bash
pnpm --filter @arutech/mobile start
```

Scan the QR code with Expo Go, or press `a` for an Android emulator — real login, tasks, calendar, and chat screens, all against the same local API. Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` if you're using a physical device instead of an emulator (see `apps/mobile/.env.example`). See [ANDROID.md](./ANDROID.md) for exactly what's built and what's never been run.

## Tests

```bash
pnpm test                              # everything
pnpm --filter @arutech/api test        # backend unit tests
pnpm --filter @arutech/api test:e2e    # backend e2e (needs the dev stack + a migrated + seeded DB up)
pnpm --filter @arutech/web test        # frontend unit tests
```

## Documentation

| Doc | Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and the full 8-phase roadmap |
| [DATABASE.md](./DATABASE.md) | Every Prisma model, what's wired up vs. schema-only |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | Invitation flow, token lifecycle, company-domain enforcement |
| [API.md](./API.md) | REST API conventions and implemented route groups |
| [NOTIFICATIONS.md](./NOTIFICATIONS.md) | The real notification pipeline (task events today) + future FCM design |
| [FCM.md](./FCM.md) | Firebase Cloud Messaging integration — code done, no live Firebase project |
| [CHAT.md](./CHAT.md) | Real-time chat design and live-verified WebSocket behavior |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment — real, locally-verified infra; not live anywhere yet |
| [LIGHTSAIL.md](./LIGHTSAIL.md) | AWS Lightsail pre-deployment safety checklist (100% unstarted, by design) |
| [VERCEL.md](./VERCEL.md) | Vercel deployment plan for apps/web (stub — no Vercel project exists yet) |
| [BACKUPS.md](./BACKUPS.md) | Postgres backup/restore — scripts run end-to-end against a real database |
| [ANDROID.md](./ANDROID.md) | Android app — code-complete, never run on-device |
| [SECURITY.md](./SECURITY.md) | Full security posture checklist — audited and fixed this project, not just documented |

## A note on scope

This is deliberately **not** a finished product in one specific sense: it has never touched a real server, domain, or app-store listing. Everything *buildable from this repo* is real and complete across all 8 phases — no fake implementations, no unstarted stubs standing in for real work. What's left is exclusively the handful of steps that require a human with actual account access, named explicitly rather than glossed over: Phase 4's FCM *code* is real and tested, but sending an actual push requires a Firebase project only a human can create (see FCM.md); Phase 6's Android app is real and code-complete (`tsc`, ESLint, and a genuine Metro bundle export all pass) but has never run on an emulator or device, since none exists in this environment (see ANDROID.md) — a compile-and-bundle check is real signal, but it isn't the same claim as "I watched it work." Phase 7's admin tooling is real and live-verified end-to-end, with one honest caveat of its own: role-permission editing persists real, audited data but doesn't gate any endpoint yet, since every guard in the app is still role-name-based, not permission-key-based (see DATABASE.md). Phase 8's production infrastructure is real, locally verified, and now being deployed for real: a genuine Docker build booted in production mode, migrated a real database, and passed a real health check; file storage was verified against a real AWS S3 bucket, not just mocks; a backup was taken and restored into a scratch database with every row count checked; and a real, dedicated AWS Lightsail instance now exists with the deployment runbook actively in progress against it (see DEPLOYMENT.md for exactly how far). What's still outstanding is a Vercel project and a real Firebase project for FCM — both require credentials only a human can provision.


```
git add .
git commit -m "fix"
git push origin main

```