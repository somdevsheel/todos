# Deployment

**Status: not deployed anywhere.** Nothing in this repo has touched `api.arutechconsultancy.com`, `workspace.arutechconsultancy.com`, or the AWS Lightsail server. This document describes the target production architecture and what exists locally toward it — it is a plan, not a record of what's live.

## Target architecture

See the diagram in [ARCHITECTURE.md](./ARCHITECTURE.md). Summary: `apps/web` deploys to Vercel ([VERCEL.md](./VERCEL.md)); `apps/api` deploys as Docker containers on the existing AWS Lightsail instance, behind NGINX, alongside — not replacing — whatever else already runs there ([LIGHTSAIL.md](./LIGHTSAIL.md)).

## What exists today toward that target

- `docker/docker-compose.dev.yml` — **local development only.** Isolated compose project name (`arutech-workspace`), non-default host ports, named volumes. Verified working: Postgres, Redis, and MailHog all start cleanly alongside this host's other unrelated Docker projects without any port collision (one collision was found and fixed during development — MailHog's default UI port 8025 was already bound by another project on the dev host — proof this isolation check is not theoretical).
- `docker/api.Dockerfile` — a real, verified multi-stage production image for `apps/api` alone: built, then actually booted in production mode against the real dockerized Postgres/Redis (over the compose network) and confirmed serving login and health traffic — not just "the build step exits 0." A root `.dockerignore` is required for this to work correctly (see below); the image does **not** include a compose file wiring it to production Postgres/Redis/NGINX — that's the remaining Phase 8 work, and per [LIGHTSAIL.md](./LIGHTSAIL.md), writing that compose file requires first inspecting the actual target server, which hasn't happened.
- The Dockerfile intentionally uses `node:20-bookworm-slim`, not `alpine` — `argon2` (a native addon) doesn't reliably resolve a working prebuilt binary against alpine's musl libc in a fresh container install, and the fallback native compile needs `python3`/`make`/`g++`, which the image installs explicitly rather than depending on prebuild detection.
- The repo root **must** have a `.dockerignore` excluding `node_modules` (and `dist`, `.next`, etc.) — without it, `COPY apps/api apps/api` silently pulls the *host's* `node_modules` into the build stage. Its pnpm symlinks are hashed against the host's own Node/pnpm resolution, which breaks module resolution inside the container in ways that look like several unrelated failures (this was discovered and fixed during Phase 2's Docker verification, not a theoretical concern).
- The Dockerfile uses a dedicated `prod-deps` stage — a separate `pnpm install --prod` — for the runtime image's `node_modules`, entirely apart from the `build` stage. Two other approaches were tried first and rejected after actually inspecting their output: `pnpm deploy --prod <dir>` did not reliably include the freshly built `dist/` in its target (it appears to respect this repo's own `.gitignore`, which lists `dist/`); `pnpm prune --prod` triggered an interactive "reinstall from scratch" prompt that, with no TTY attached, proceeded anyway and wiped the just-built `dist/` as collateral. The `prod-deps` stage runs its own `prisma generate` too (which is why `prisma`, the CLI, is a `dependency` and not a `devDependency` in `apps/api/package.json` — it's also needed for `prisma migrate deploy` at real deploy time).

## Known production gap: file storage

`STORAGE_PROVIDER=local` (the only implementation that exists — see `apps/api/src/files/storage/`) writes uploaded files to a directory on the API container's own disk. This is fine for exactly one long-lived instance with a persistent volume, but breaks the moment there's more than one API instance (uploads land on whichever instance served that request, invisible to the others) or the container is redeployed without a persistent volume mount (uploads are lost entirely). Production deployment must either mount `STORAGE_LOCAL_DIR` to a persistent volume on the Lightsail host, or implement the `s3` `StorageProvider` (the interface is already provider-agnostic — see `DATABASE.md`'s File section) before going live with real user uploads.

## Still to build (Phase 8)

- `workspace-worker` and `workspace-websocket` service Dockerfiles (don't exist yet — there's no worker or WebSocket gateway code yet either, see [ARCHITECTURE.md](./ARCHITECTURE.md)).
- A production `docker-compose.yml` (distinct from the dev one) for the Lightsail host, using the same isolated-project-name discipline as the dev compose file, with a persistent volume for `STORAGE_LOCAL_DIR` (or an S3-compatible `StorageProvider`, per the gap above).
- NGINX config for `api.arutechconsultancy.com` — HTTPS, HTTP→HTTPS redirect, WebSocket upgrade headers, security headers, request size limits, proxy timeouts — written only after inspecting the Lightsail host's existing NGINX config, per [LIGHTSAIL.md](./LIGHTSAIL.md).
- Structured production logging/monitoring beyond NestJS's default `Logger` and the health endpoint.
- A backup strategy for the production Postgres instance.
