# AWS Lightsail Deployment Safety

**No Lightsail server has been inspected, touched, or configured by this repository or by any work in this session.** This document is the checklist that must be completed, in order, before anything here is deployed to the existing Lightsail instance — not a record of it having happened.

## Why this matters

The target Lightsail server already hosts another application. Arutech Workspace must be added alongside it without interfering — same host, isolated resources.

## Mandatory pre-deployment checklist

Before running anything on the actual Lightsail server:

1. SSH in and inspect what's already running: `docker ps -a`, `docker network ls`, `docker volume ls`.
2. Identify ports already bound: `ss -tlnp` (or `netstat -tlnp`) — do not assume 80/443/5432/6379 are free.
3. Read the existing NGINX config in full (`/etc/nginx/sites-enabled/*` or wherever it lives) before writing or touching anything under it.
4. Identify the existing database(s) — is Postgres already running for the other app? On what port, in what container, with what credentials scope?
5. Check available RAM, CPU, and disk (`free -h`, `nproc`, `df -h`) — Arutech Workspace's Postgres + Redis + API + (eventually) worker + WebSocket containers all need headroom that must actually exist.
6. Check existing firewall rules (`ufw status` or the Lightsail console's networking tab).
7. Take a snapshot/backup of the instance before any change, if the hosting plan allows it.

## Hard rules

- Do not overwrite the existing NGINX configuration — add a new server block for `api.arutechconsultancy.com`, don't touch the existing one's routes.
- Do not reuse the existing app's Docker Compose project — Arutech Workspace gets its own compose project name (matching the `arutech-workspace` discipline already used in `docker/docker-compose.dev.yml` for local dev), isolated network, isolated volumes.
- Do not bind to a port the existing app already uses.
- Do not touch the existing app's database or Redis instance — Arutech Workspace provisions and connects to its own.
- Do not change existing firewall rules to be more permissive without an explicit reason tied to this deployment.
- The existing application must remain fully operational throughout and after this deployment. If any step's outcome is uncertain, stop and get confirmation rather than guessing on a shared production host.

## Status

Every item above is unstarted. [DEPLOYMENT.md](./DEPLOYMENT.md) covers what's ready to deploy — as of Phase 8, that's a real, locally-verified `docker-compose.prod.yml` and an NGINX config template (`docker/nginx/api.arutechconsultancy.com.conf.template`) — once this checklist has actually been walked through against the real server. Neither file is to be applied blindly; the NGINX template in particular assumes nothing about what's already in the host's config and must be adapted after step 3 above, not before.
