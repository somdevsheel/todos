# Arutech Workspace

Internal collaboration platform for **Arutech Consultancy Services LLP** — company-only authentication, RBAC, task management, calendar, real-time chat, and push-notification-driven workflows, built as the foundation for a future multi-tenant SaaS product.

**This repository currently implements Phases 1–3 (Foundation + Tasks + Calendar)** of an 8-phase roadmap. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full plan and exactly what is/isn't built yet. All three phases are real and fully working end-to-end locally — not a prototype — but Chat, FCM push, and production deployment are intentionally not built yet; each has a short honest doc stub explaining what's coming.

## What's built

- Invitation-only authentication (Argon2id, JWT access + rotating refresh tokens, company-domain enforcement) — see [AUTHENTICATION.md](./AUTHENTICATION.md)
- RBAC (SUPER_ADMIN / ADMIN / MANAGER / EMPLOYEE), organizations, departments, teams
- Full task management: CRUD, assignment (with authorization rules), status/priority, comments with explicit @mentions, subtasks, file attachments (provider-abstracted storage, local-disk today) — list and Kanban views
- Full calendar: event CRUD, RSVP, month/week/day/agenda views, a "my calendar" default scope with an optional team-calendar mode, and a real BullMQ reminder worker (running in-process — see ARCHITECTURE.md's Phase 8 note) that turns a user-set reminder into a `TASK_DUE_SOON`/`TASK_OVERDUE`/`EVENT_REMINDER` notification, idempotently
- Real notifications: task assignment/comments/mentions/completion, event invites/updates/cancellations, and fired reminders all produce real rows in the notification center, not just placeholders
- Audit logging, health checks, centralized error handling
- A responsive Next.js web app: login/invitation/password-reset flows, role-aware dashboard with live task + upcoming-event stats, task list/Kanban/detail pages, a full calendar UI, employee/team directories, a working notification center, and an admin panel with an invite form + audit log viewer
- The **full database schema** for every remaining feature (chat, notification preferences) — correct, indexed, and ready, but not yet wired to business logic — see [DATABASE.md](./DATABASE.md)
- An Expo/React Native placeholder app that boots and points at the same API (real screens land in Phase 6)

## Monorepo layout

```
apps/
  api/      NestJS backend (REST API + an in-process BullMQ reminder worker; WebSocket gateway lands in a later phase)
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

This is deliberately **not** a finished product. Building an entire 63-section spec's worth of features (chat, FCM push, an Android app, and a live production deployment) in one pass would mean faking large parts of it. Instead, Phases 1–3 are real and complete, and every later feature exists today only as: (a) correct database schema, (b) an empty module folder with a README pointing at the roadmap, and (c) a short honest doc stub — never as something that looks done but isn't.
