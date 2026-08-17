# Authentication

## Principles

1. **No public registration, ever** — accounts are created exclusively via the invitation flow below. There is no `POST /users` that creates a new account from arbitrary input.
2. **Company-domain restriction is backend-enforced**, centrally, three times: at invite creation, at login, and again at invitation acceptance (defense-in-depth, in case an admin's session were compromised and used to invite an already-mismatched email). The frontend never re-implements this check — see `ALLOWED_EMAIL_DOMAINS` below.
3. **Passwords are never stored or logged in plaintext.** Argon2id, with explicit OWASP-minimum cost parameters (`memoryCost: 19456, timeCost: 2, parallelism: 1`), defined once in `apps/api/src/auth/auth.service.ts`.
4. **Tokens that grant access are stored hashed**, exactly like passwords: invitation tokens, password-reset tokens, and refresh tokens are all SHA-256-hashed before hitting the database (`apps/api/src/auth/token.util.ts`). A stolen database dump alone cannot be used to impersonate anyone or accept a pending invitation.

## The invitation → activation flow

```
Admin/Super Admin
      |  POST /auth/invite {email, firstName, lastName, role, departmentId?, teamId?}
      |  - domain-checked (EmailDomainService)
      |  - creates User(status=PENDING_INVITE) + UserRole + Invitation(tokenHash, expires in 7d)
      |  - emails the raw token as a link (MailHog in dev, real SMTP in prod)
      v
Employee's inbox
      |  clicks link -> web app's /register?token=...
      |  GET /auth/invitations/:token  (public preview: email/org/role/expiry)
      v
Employee sets a password
      |  POST /auth/accept-invitation {token, password}
      |  - re-validates token + domain (defense-in-depth)
      |  - Argon2id-hashes the password, sets User.status=ACTIVE, Invitation.status=ACCEPTED
      |  - auto-issues an access+refresh token pair (immediate login)
      v
Account activated, employee is signed in
```

Note this is **not** a separate "verify your email" step followed by a separate "set your password" step — possessing the invitation token (i.e., having access to the invited inbox) *is* the email verification. The `/verify-email` route exists for the URL shape the product spec calls out, and simply forwards into `/register?token=...` when a token is present.

## Login, refresh rotation, and reuse detection

- `POST /auth/login` — throttled (5/min), re-checks the company domain, rejects unknown emails and wrong passwords with the **same generic message** ("Invalid email or password") so a caller cannot distinguish "no such account" from "wrong password." Non-`ACTIVE` accounts (still `PENDING_INVITE`, or `SUSPENDED`/`DEACTIVATED`) are rejected with a distinct, honest message.
- `POST /auth/refresh` — the access token is short-lived (15 minutes by default); the refresh token is long-lived (30 days) and **rotates on every use**: presenting a valid refresh token immediately revokes it and issues a brand new pair. The old `Session` row is kept (marked `revokedAt`), not deleted.
- **Reuse detection**: if an already-revoked refresh token is ever presented again, that's treated as a strong signal the token was stolen and used by someone else after the legitimate rotation — every session for that user is revoked immediately, and a `SECURITY_REFRESH_REUSE_DETECTED` audit entry is written. The legitimate user is forced to sign in again everywhere, same as the attacker.
- `POST /auth/logout` revokes the one session tied to the presented refresh token. `POST /auth/logout-all` revokes every session for the user (also triggered automatically by a password reset).

## Token transport: httpOnly-cookie BFF (web), not client-stored JWT

The NestJS API returns tokens in the **JSON response body**, never as a `Set-Cookie` header — this keeps the API itself transport-agnostic, which matters because the Android app (Phase 6) will consume the exact same endpoints but store tokens in secure device storage instead of a cookie.

The Next.js app is the one place that turns those tokens into cookies: its Route Handlers under `app/api/auth/*` call the NestJS API server-to-server, then set the returned tokens as `httpOnly`, `Secure` (in production), `SameSite=Lax` cookies on the **Next.js origin**. Client-side JavaScript in the browser never touches a raw token — this is what removes XSS token theft as an attack vector, which is the reason this pattern was chosen over `localStorage`. Because the browser only ever talks to the Next.js origin, `SameSite=Lax` plus same-origin Route Handlers cover CSRF for state-changing requests, and the NestJS API's CORS policy is a strict allowlist of just the Next.js origin (`CORS_ORIGINS`) — the browser never calls the API directly.

### Silent refresh happens in `middleware.ts`, not in a Server Component

Next.js Server Components cannot set cookies during render (only Route Handlers, Server Actions, and Middleware can). So the "if the access token is missing/expired but a refresh token exists, try one silent rotation before giving up" logic lives in `apps/web/src/middleware.ts` — it's the only layer that runs *before* a protected page renders and *can* mutate cookies on the response. If refresh succeeds, the request proceeds with fresh cookies already set; if it fails, the user is redirected to `/login?next=<path>`.

One consequence worth being explicit about: because the access-token cookie's `maxAge` is set to match the JWT's own expiry, the browser stops sending it once it's actually expired — so the common case (`token expired` → `no cookie sent` → `middleware refreshes`) is handled. A token that's been **revoked** server-side (e.g. by `logout-all` from another device) but hasn't hit its natural expiry yet will still be sent by the browser; middleware lets it through (it only checks *presence*), and the first real data fetch against the API returns 401, which `requireAuth()`/`requireRole()` in `apps/web/src/lib/auth.ts` turn into a redirect to `/login`. This is standard JWT-session behavior, not an oversight — closing that narrow gap earlier would mean re-validating the token against the database on every middleware invocation, defeating the point of using a JWT at all.

## Centralized company-domain configuration

```
ALLOWED_EMAIL_DOMAINS=arutechconsultancy.com
```

Parsed once, in `apps/api/src/config/configuration.ts`, into `config.auth.allowedEmailDomains: string[]`. The **only** consumer is `apps/api/src/auth/email-domain.service.ts` (`EmailDomainService.isAllowedDomain()`), called from exactly three places in `AuthService`: `invite()`, `login()`, and `acceptInvitation()`. No other file re-implements or re-parses this string. To onboard a second domain (e.g. after a company rename or acquisition), change one environment variable — no code change, no redeploy of logic.

## RBAC guard pipeline

```
ThrottlerGuard → JwtAuthGuard → RolesGuard → OrgScopeGuard
```

- `JwtAuthGuard` verifies the access token and attaches `request.user = {sub, email, organizationId, roles}`. Routes marked `@Public()` skip it entirely (login, refresh, accept-invitation, invitation preview, forgot/reset-password, health).
- `RolesGuard` checks `@Roles('ADMIN', 'MANAGER')`-style metadata against `request.user.roles`; a route with no `@Roles()` is open to any authenticated user.
- `OrgScopeGuard` is the "never trust a frontend-supplied id" checkpoint: any route with a `:id` param that resolves to a single resource (`@OrgScopeResource({model: 'user'})`, etc.) has that resource's `organizationId` checked against the caller's before the handler runs — a 403, not a leaked cross-tenant record, if they don't match. Collection endpoints (lists) are scoped by filtering every service-layer query with `organizationId` from `request.user`, not by this guard.

## Session management surfaced to users

- Logout (current device) and logout-all (every device) are both implemented (`POST /auth/logout`, `POST /auth/logout-all`).
- Admins can deactivate another user's account (`POST /users/:id/deactivate`), which also revokes all of that user's active sessions in the same transaction.
- A deactivated account can be reactivated (`POST /users/:id/activate`) — but only if it had already accepted its invitation (has a password hash); otherwise re-inviting is the correct path.

## What's deliberately not built yet

Multi-factor authentication, SSO/OIDC, and passwordless magic-links are not part of Phase 1 and aren't in the current roadmap — see [ARCHITECTURE.md](./ARCHITECTURE.md) if that changes.
