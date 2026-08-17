# Database

PostgreSQL via Prisma. Schema source of truth: `apps/api/prisma/schema.prisma`. 27 models total — the spec's 25 core tables plus `Invitation` and `PasswordResetToken` (both required to implement the mandated invitation-based auth flow; not in the original table list, added deliberately and called out here).

## Conventions

- `id String @id @default(uuid())` on every table.
- `createdAt`/`updatedAt` on every mutable table; `AuditLog` is the one intentional exception (immutable — no `updatedAt`, no soft-delete).
- Nullable `deletedAt` (soft delete) on user-manageable content: `Organization`, `User`, `Department`, `Team`, `Task`, `TaskComment`, `Event`, `Conversation`, `Message`, `File`. Join/log tables (`UserRole`, `TeamMember`, `AuditLog`, etc.) hard-delete or are immutable — there's nothing meaningful to "soft delete" about a membership row.
- `organizationId` on every business entity **except** the global `Role`/`Permission` catalog — always taken from the authenticated request's organization at the service layer, never accepted from the client, never hardcoded.
- `User.email` is unique per `(organizationId, email)`, not globally unique. This is the one place multi-tenancy readiness shows up concretely: the schema does not assume there's only ever one organization, even though today `ALLOWED_EMAIL_DOMAINS` and the seed data effectively create just one.

## RBAC tables (hybrid design)

The spec calls for `roles`/`permissions`/`user_roles` as real tables (so a fifth role can be added later without a code change), but a per-request DB join for every authorization check would be wasteful. The design:

```
Role ──< RolePermission >── Permission        (catalog, seeded)
Role ──< UserRole >── User, scoped by organizationId   (assignment, source of truth)
```

At login/refresh, `UserRole` is resolved once into a `roles: string[]` array embedded in the JWT access token. `RolesGuard` checks that array directly — no DB hit per request. The database stays authoritative (a role change takes effect on the user's next login or token refresh, not instantly on every open tab); this tradeoff is documented, not accidental.

`RolePermission` is seeded (SUPER_ADMIN/ADMIN get every seeded permission key) but there's no API to edit it yet — fine-grained permission editing beyond the four role names is a later-phase concern. Phase 1 authorization is entirely role-name-based (`@Roles('ADMIN', 'MANAGER')`), not permission-key-based.

## Full CRUD (Phase 1 + 2)

`Organization`, `User`, `Role` (read), `Permission` (read), `UserRole` (assign/revoke), `Department`, `Team`, `TeamMember`, `Session`, `Invitation`, `PasswordResetToken`, `AuditLog` (write always; read for SUPER_ADMIN), `Notification` (Phase 1 shipped list/mark-read; Phase 2's tasks module is the first real *producer* — see `NotificationsService.create()`/`createMany()`), `UserDevice` (register/list/soft-deactivate — nothing consumes the token for push yet, that's Phase 4).

As of Phase 2: `Task`, `TaskAssignee`, `TaskComment`, `TaskAttachment`, `File`. `TaskComment` has one field beyond the spec's original list — `mentionedUserIds String[] @default([])`, a plain Postgres array, not a join table, added in migration `task_comment_mentions`. Explicit picker-selected @mentions are a property of the comment's content at creation time, not a relation with its own lifecycle, so a join table would be over-modeling it. `File` stores metadata only (`storageKey`, never bytes) — see [DEPLOYMENT.md](./DEPLOYMENT.md) for the storage-provider abstraction.

## Schema-only (correct DDL, no business logic yet)

`Event`, `EventParticipant`, `Reminder`, `Conversation`, `ConversationMember`, `Message`, `MessageAttachment`, `NotificationPreference`. Each has indexes chosen for the query patterns its owning phase will need (e.g. `Task` already had `@@index([organizationId, status])` and `@@index([organizationId, dueDate])` before Phase 2 wired up any queries against them — cheap to add ahead of time, expensive to retrofit onto a populated table later; the same principle applied to these still-unused tables).

`Reminder` specifically has `@@unique([userId, relatedEntityType, relatedEntityId, remindAt])` — this is the mechanism that will make the Phase 3 reminder worker idempotent: a duplicate insert from a retried BullMQ job is impossible at the database level, not just "unlikely."

## Auth-specific tables not in the spec's literal list

- **`Invitation`**: `{email, tokenHash, status, expiresAt, roleId, departmentId?, teamId?, invitedByUserId}`. The token is stored **hashed** (SHA-256), never raw — identical treatment to a password or a refresh token, because possessing the raw token is equivalent to possessing the invited person's identity until they set a password.
- **`PasswordResetToken`**: same hashed-token treatment, 1-hour expiry, single-use (`usedAt`).
- **`Session`**: backs refresh-token rotation. Stores `refreshTokenHash` (never the raw token), `revokedAt` (nullable — a non-null value marks it superseded/logged-out, and is what makes refresh-token-reuse detection possible: a *second* presentation of an already-revoked token is treated as a compromise signal). See [AUTHENTICATION.md](./AUTHENTICATION.md).

## Enums vs. plain strings

Postgres enums are used for closed, stable sets that changing would already require code changes anyway: `UserStatus`, `InvitationStatus`, `TaskStatus`, `TaskPriority`, `EventRsvpStatus`, `ConversationType`, `DevicePlatform`, `NotificationChannel`.

`AuditLog.action` is deliberately a plain `String` column, not an enum — the canonical list of action names lives in `packages/shared-types/src/audit.ts` (`AUDIT_ACTIONS`) as an app-level contract. New audit actions (and later phases will add many: `TASK_CREATED`, `EVENT_CANCELLED`, `MESSAGE_DELETED`, etc.) never require a database migration.

## Running migrations

```bash
pnpm --filter @arutech/api prisma:migrate   # dev: creates + applies a migration
pnpm --filter @arutech/api prisma:deploy    # CI/prod: applies existing migrations only
pnpm --filter @arutech/api prisma:studio    # browse data locally
```

Migration files live in `apps/api/prisma/migrations/` and are committed — they are the reviewable history of every schema change, including the ones for tables that have no business logic behind them yet.
