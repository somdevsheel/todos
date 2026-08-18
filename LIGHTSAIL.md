# AWS Lightsail Deployment Safety

**This checklist was written assuming a shared host with another application already on it — reality turned out simpler.** The actual Lightsail instance provisioned for this project (`arutech-workspace`, Mumbai/`ap-south-1a`, public IP `43.205.207.204`) is a **fresh, dedicated instance created specifically for Arutech Workspace**, confirmed by actually inspecting it (see the checklist below, now with real findings, not hypothetical ones). Nothing else runs on it. The hard rules below stay as good practice — they're what to fall back to if this box is ever shared with another app later — but most of the checklist itself turned out to be quick confirmations of "there's nothing here," not a careful negotiation around existing infrastructure.

## Why this matters (kept for the scenario where it eventually does)

If this host is ever shared with another application, Arutech Workspace must be added alongside it without interfering — same host, isolated resources. That didn't end up being the situation here, but the discipline below (isolated compose project name, no touching another app's ports/database/NGINX routes) is worth keeping as the default posture for any future shared-host deployment, not just this one.

## Pre-deployment checklist — actually walked, with real findings

1. ~~SSH in and inspect what's already running: `docker ps -a`, `docker network ls`, `docker volume ls`.~~ **Done** — `docker` wasn't even installed yet (fresh Ubuntu image), confirming nothing was running.
2. ~~Identify ports already bound: `ss -tlnp`.~~ **Done** — only port 22 (SSH) and the local DNS resolver stub were listening. 80/443/5432/6379 all free.
3. Read the existing NGINX config in full before writing or touching anything under it. **N/A** — no NGINX installed yet either; nothing to read.
4. Identify existing database(s). **N/A** — no existing Postgres/Redis; this deployment provisions its own via `docker-compose.prod.yml`.
5. ~~Check available RAM, CPU, and disk (`free -h`, `nproc`, `df -h`).~~ **Done** — 1GB RAM (tight; addressed with a 2GB swapfile, not a plan upgrade — a deliberate cost/simplicity tradeoff for a low-traffic internal tool), 2 vCPUs, 40GB SSD with 35GB free.
6. Check existing firewall rules (`ufw status`). **Not yet done** — worth confirming before opening 80/443 for NGINX, even on a dedicated box, since Lightsail's own network firewall (console-side) is a separate layer from `ufw`.
7. Take a snapshot/backup of the instance before any change, if the hosting plan allows it. **Not yet done** — worth doing once the instance has something on it actually worth protecting (i.e., after the initial deploy succeeds), not before.

## Hard rules (still the right default, kept for if this host is ever shared later)

- Do not overwrite the existing NGINX configuration — add a new server block for `api.arutechconsultancy.com`, don't touch any other one's routes.
- Do not reuse another app's Docker Compose project — Arutech Workspace gets its own compose project name (`arutech-workspace`, matching `docker/docker-compose.dev.yml`'s local-dev discipline), isolated network, isolated volumes.
- Do not bind to a port another app already uses.
- Do not touch another app's database or Redis instance.
- Do not change existing firewall rules to be more permissive without an explicit reason tied to this deployment.
- Any existing application on the host must remain fully operational throughout and after this deployment. If any step's outcome is uncertain, stop and get confirmation rather than guessing on a shared production host.

## Status

The checklist above has actually been walked against the real instance — see [DEPLOYMENT.md](./DEPLOYMENT.md)'s step-by-step runbook for exactly how far the rest of the real rollout has gotten (Docker install, repo clone, `.env.production`, `docker compose up`, NGINX/TLS, DNS verification — tracked there with checkboxes, updated as each step is actually completed).
