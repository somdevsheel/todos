# Arutech Workspace

Internal collaboration platform for **Arutech Consultancy Services LLP** — company-only authentication, RBAC, task management, calendar, real-time chat, and push-notification-driven workflows, built as the foundation for a future multi-tenant SaaS product.

**This repository currently implements Phases 1–5 (Foundation + Tasks + Calendar + FCM + Chat)** of an 8-phase roadmap. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full plan and exactly what is/isn't built yet. All five phases are real and fully working end-to-end locally — not a prototype — with one caveat: Phase 4's push-delivery *code* is done and tested, but no real Firebase project exists to send a live push through yet (see [FCM.md](./FCM.md) — that step requires a human with account access). Production deployment is the only piece intentionally not built yet.

## What's built

- Invitation-only authentication (Argon2id, JWT access + rotating refresh tokens, company-domain enforcement) — see [AUTHENTICATION.md](./AUTHENTICATION.md)
- RBAC (SUPER_ADMIN / ADMIN / MANAGER / EMPLOYEE), organizations, departments, teams
- Full task management: CRUD, assignment (with authorization rules), status/priority, comments with explicit @mentions, subtasks, file attachments (provider-abstracted storage, local-disk today) — list and Kanban views
- Full calendar: event CRUD, RSVP, month/week/day/agenda views, a "my calendar" default scope with an optional team-calendar mode, and a real BullMQ reminder worker (running in-process — see ARCHITECTURE.md's Phase 8 note) that turns a user-set reminder into a `TASK_DUE_SOON`/`TASK_OVERDUE`/`EVENT_REMINDER` notification, idempotently
- Real-time chat: direct + group conversations, an authenticated Socket.IO gateway (ticket-based auth that keeps the real session JWT httpOnly — see [AUTHENTICATION.md](./AUTHENTICATION.md)), typing indicators, presence, read receipts, and @mentions, with an online/push notification-dedup rule that's been live-verified against the actual gateway — see [CHAT.md](./CHAT.md)
- Real notifications: task assignment/comments/mentions/completion, event invites/updates/cancellations, fired reminders, and new/mentioned chat messages all produce real rows in the notification center, not just placeholders — and fan out to FCM push (gracefully disabled without real Firebase credentials — see [FCM.md](./FCM.md)), with user-editable per-category push preferences in Settings
- Audit logging, health checks, centralized error handling
- A responsive Next.js web app: login/invitation/password-reset flows, role-aware dashboard with live task/event/message stats, task list/Kanban/detail pages, a full calendar UI, a real-time chat UI, employee/team directories, a working notification center with editable push preferences, and an admin panel with an invite form + audit log viewer
- The **full database schema** for the remaining spec surface — correct, indexed, and ready — see [DATABASE.md](./DATABASE.md)
- An Expo/React Native placeholder app that boots and points at the same API (real screens, including FCM registration and chat, land in Phase 6)

## Monorepo layout

```
apps/
  api/      NestJS backend (REST API + an in-process BullMQ reminder worker + an authenticated Socket.IO chat gateway)
  web/      Next.js frontend (App Router, Tailwind, responsive desktop/tablet/mobile)
  mobile/   Expo/React Native Android app (Phase 1 = placeholder screen only)
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
| SUPER_ADMIN | somdev@arutechconsultancy.com | `ArutechDev#2026` |
| ADMIN | priya.admin@arutechconsultancy.com | `ArutechDev#2026` |
| MANAGER | kajal.manager@arutechconsultancy.com | `ArutechDev#2026` |
| EMPLOYEE | rahul.dev@arutechconsultancy.com | `ArutechDev#2026` |
| EMPLOYEE | anita.ml@arutechconsultancy.com | `ArutechDev#2026` |

To try the full invitation flow: sign in as an ADMIN/SUPER_ADMIN, go to **Admin → Invite an employee**, submit a `@arutechconsultancy.com` address, then open the email in MailHog (http://localhost:8095) and click the link.

To try tasks: go to **Tasks → New task**, assign it to another seeded user, then sign in as that user to see the assignment notification and the task on their **My Tasks** view. Comment with an @mention to see a second notification arrive for the mentioned person, and attach a file to see the local-disk upload/download round trip.

### Mobile placeholder

```bash
pnpm --filter @arutech/mobile start
```

Scan the QR code with Expo Go, or press `a` for an Android emulator. See [ANDROID.md](./ANDROID.md).

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
| [FCM.md](./FCM.md) | Firebase Cloud Messaging integration plan (stub) |
| [CHAT.md](./CHAT.md) | Real-time chat design (stub) |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment plan (stub) |
| [LIGHTSAIL.md](./LIGHTSAIL.md) | AWS Lightsail deployment safety rules (stub) |
| [VERCEL.md](./VERCEL.md) | Vercel deployment plan for apps/web (stub) |
| [ANDROID.md](./ANDROID.md) | Android app roadmap (stub) |
| [SECURITY.md](./SECURITY.md) | Security posture summary (stub — details live in AUTHENTICATION.md today) |

## A note on scope

This is deliberately **not** a finished product. Building an entire 63-section spec's worth of features (a live Firebase project, an Android app, and a production deployment) in one pass would mean faking large parts of it. Instead, Phases 1–5 are real and complete — Phase 4 with one explicit exception: the FCM *code* is real and tested, but sending an actual push requires a Firebase project only a human can create (see FCM.md), so that specific piece is honestly "written, not verified live," not "done." Phases 6–8 exist today only as: (a) correct database schema, (b) an empty module folder or placeholder screen with a README pointing at the roadmap, and (c) a short honest doc stub — never as something that looks done but isn't.
