# Security

This summarizes what's actually implemented today. Deep detail on the auth-specific items lives in [AUTHENTICATION.md](./AUTHENTICATION.md) — this file is the checklist view across the whole system.

## Implemented (Phase 1)

- **Transport**: `helmet()` on every response; CORS locked to an explicit origin allowlist (`CORS_ORIGINS`), not a wildcard — the browser never calls the NestJS API directly, only the Next.js BFF does, server-to-server.
- **Passwords**: Argon2id, explicit cost parameters, never logged, never returned in any API response (Prisma queries that touch `User` never `select` `passwordHash` into a response DTO).
- **Tokens**: JWT access tokens (short-lived) + opaque, hashed, rotating refresh tokens with reuse detection (see [AUTHENTICATION.md](./AUTHENTICATION.md)). Invitation tokens and password-reset tokens are hashed the same way.
- **RBAC**: enforced server-side via a three-guard pipeline (`JwtAuthGuard` → `RolesGuard` → `OrgScopeGuard`) applied per-route, not inferred from frontend state.
- **Organization scoping ("never trust a frontend-supplied id")**: every `:id` route that resolves to a single resource is checked against the caller's `organizationId` by `OrgScopeGuard` before the handler runs; every collection query is filtered by `organizationId` at the service layer, sourced from the verified JWT, never from a request parameter.
- **Input validation**: every request body is a `class-validator` DTO with `whitelist: true, forbidNonWhitelisted: true` — unknown fields are rejected, not silently dropped.
- **Rate limiting**: a global default throttle (`@nestjs/throttler`, configured from `THROTTLE_TTL`/`THROTTLE_LIMIT`) plus a stricter explicit limit (5 requests/minute) on every unauthenticated auth-adjacent endpoint (login, accept-invitation, forgot-password, reset-password).
- **No user enumeration**: login failures for "no such account" and "wrong password" return the identical generic message; `forgot-password` returns the identical success response whether or not the email exists.
- **Error handling**: a single global exception filter produces the `{success:false,error:{code,message}}` envelope for every error path; unexpected exceptions are logged in full server-side (with stack trace) but the client only ever receives a generic message — a raw stack trace never crosses the wire, in any environment, not just production.
- **Company-domain restriction**: centralized in one service (`EmailDomainService`), backend-enforced at every account-creation/authentication touchpoint — see [AUTHENTICATION.md](./AUTHENTICATION.md).
- **Config fail-fast**: a zod schema validates every environment variable at bootstrap; production mode additionally requires ≥32-character JWT secrets, a non-localhost CORS origin, and a real SMTP host (not the dev MailHog catcher) — misconfiguration aborts startup instead of surfacing later as a runtime security gap.
- **Audit logging**: every invite, activation, login (success and failure, with a reason), logout, logout-all, password-reset request/completion, role assignment/revocation, and CRUD mutation on departments/teams/organization settings writes an immutable `AuditLog` row with actor, IP, user agent, and a JSON metadata blob. Audit-log write failures are caught and logged, never allowed to fail the business operation they're describing (see `AuditService.log()`), and never permanently lost by design (no delete endpoint exists).
- **Secrets**: `.env` is gitignored; `.env.example` contains no real values; the JWT/SMTP/database secrets used locally are dev-only placeholders documented as such.

## Deliberately not built yet

- **CSRF tokens as a separate mechanism** — covered today by `SameSite=Lax` cookies plus the BFF-only architecture (the API's CORS policy rejects everything except the Next.js origin); a dedicated CSRF token would be revisited if the cookie policy ever needs to loosen.
- **File upload validation** (MIME/size limits) — there is no file upload endpoint yet; `File` is schema-only (see [DATABASE.md](./DATABASE.md)).
- **Fine-grained permission-key authorization** — Phase 1 authorization is role-name-based; `Permission`/`RolePermission` exist in the schema but aren't consulted by any guard yet.
- **MFA / SSO** — not in the current roadmap (see [ARCHITECTURE.md](./ARCHITECTURE.md)).
- **Production TLS termination, NGINX security headers, firewall rules** — nothing is deployed yet; see [DEPLOYMENT.md](./DEPLOYMENT.md) and [LIGHTSAIL.md](./LIGHTSAIL.md).

## Reporting

There is no external-facing deployment yet, so there is no public security-contact process to document. Internally, security-relevant findings should be raised directly with the workspace's SUPER_ADMIN.
