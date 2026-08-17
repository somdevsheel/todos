# Vercel Deployment

**Status: not deployed.** No Vercel project has been created for this repository.

## Plan

- Only `apps/web` deploys to Vercel — the NestJS API stays off Vercel and runs on Lightsail (see [DEPLOYMENT.md](./DEPLOYMENT.md)); there's no architectural reason to run a stateful, WebSocket-serving, long-running Nest process on a serverless platform.
- Target domain: `workspace.arutechconsultancy.com`.
- Because this is a pnpm workspace, Vercel's project settings need:
  - Root Directory: `apps/web`
  - Install Command: `pnpm install --filter @arutech/web...` (or let Vercel's monorepo detection handle it — verify either way before relying on it)
  - Build Command: `pnpm --filter @arutech/web build` (or default, if Root Directory + monorepo detection is enough)
- Environment variables, set separately per Vercel environment (Development/Preview/Production), never shared as one value:
  - `API_INTERNAL_URL` — the backend's REST base URL as reachable from Vercel's servers (production: `https://api.arutechconsultancy.com/api/v1`)
  - `NEXT_PUBLIC_API_URL` — same value, exposed to the client bundle only where actually needed (currently unused directly by client code; the BFF pattern in `apps/web/src/lib/api-client.ts` means almost all API calls happen server-side)
  - `NEXT_PUBLIC_APP_NAME`
- `NODE_ENV=production` is set automatically by Vercel for Production deployments — the app's cookie `Secure` flag (`apps/web/src/lib/session-cookies.ts`) and CORS expectations depend on this being accurate.

## Not yet done

- No Vercel project exists.
- No custom domain has been attached.
- No production `API_INTERNAL_URL` exists yet, because no API deployment exists yet (see [LIGHTSAIL.md](./LIGHTSAIL.md)) — deploying the frontend before the backend is reachable would just produce a frontend that can't log anyone in.
