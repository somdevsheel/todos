# Vercel Deployment

**Status: real deployment in progress.** A Vercel project has been created and connected to this repo; the first deploy attempt failed on a real, now-documented monorepo build gap (see below) — fix applied, redeploy pending.

## Plan

- Only `apps/web` deploys to Vercel — the NestJS API stays off Vercel and runs on Lightsail (see [DEPLOYMENT.md](./DEPLOYMENT.md)); there's no architectural reason to run a stateful, WebSocket-serving, long-running Nest process on a serverless platform.
- Target domain: `workspace.arutechconsultancy.com`.
- Because this is a pnpm workspace, Vercel's project settings need:
  - Root Directory: `apps/web`
  - Install Command: default is fine — **confirmed working**: Vercel's own monorepo detection correctly ran `pnpm install` at the workspace root (`Scope: all 5 workspace projects`), no override needed.
  - Build Command: **must be overridden — the default is NOT enough**, confirmed by actually hitting the failure: Vercel's default build command only runs `apps/web`'s own `next build`, never building the sibling `packages/shared-types` workspace package first. Since `@arutech/shared-types` resolves via a symlink to `packages/shared-types/dist/` (produced by `tsc`, not committed to git), every one of the ~20 files that import from it fails with `Module not found`. The fix:
    ```
    cd ../.. && pnpm --filter @arutech/shared-types build && pnpm --filter @arutech/web build
    ```
    Set this as an explicit **Build Command override** in Project Settings — don't rely on the default.
- Environment variables, set separately per Vercel environment (Development/Preview/Production), never shared as one value:
  - `API_INTERNAL_URL` — the backend's REST base URL as reachable from Vercel's servers (production: `https://api.arutechconsultancy.com/api/v1`)
  - `NEXT_PUBLIC_API_URL` — same value, exposed to the client bundle only where actually needed. As of Phase 5, one real client-side consumer: `lib/socket.ts` derives the chat WebSocket's origin from it (`new URL(...).origin`) — the one deliberate case where the browser talks to the API directly instead of through the BFF, since a persistent Socket.IO connection can't be proxied through Vercel's serverless functions (see AUTHENTICATION.md's "WebSocket authentication"). Every REST call still goes through the BFF pattern in `apps/web/src/lib/api-client.ts` server-side.
  - `NEXT_PUBLIC_APP_NAME`
- `NODE_ENV=production` is set automatically by Vercel for Production deployments — the app's cookie `Secure` flag (`apps/web/src/lib/session-cookies.ts`) and CORS expectations depend on this being accurate.

## Not yet done

- No Vercel project exists.
- No custom domain has been attached.
- No production `API_INTERNAL_URL` exists yet, because no API deployment exists yet (see [LIGHTSAIL.md](./LIGHTSAIL.md)) — deploying the frontend before the backend is reachable would just produce a frontend that can't log anyone in.
