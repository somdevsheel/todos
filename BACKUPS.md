# Backups

**Status: the scripts are real and verified; the schedule is documented, not installed anywhere.** No cron/systemd timer has actually been set up on any real server — there is no real server yet (see [LIGHTSAIL.md](./LIGHTSAIL.md)). What's below is what to install once one exists.

## What's covered, and what isn't

`scripts/backup-postgres.sh` covers **Postgres only** — every table, via `pg_dump -Fc` (custom format, compressed, restorable selectively with `pg_restore -l`). It does **not** cover:

- **Local-disk file uploads** (`STORAGE_PROVIDER=local`, the shipped Phase 8 default — see [DEPLOYMENT.md](./DEPLOYMENT.md)). Those live in the `arutech-workspace-uploads-data` Docker volume, entirely separate from Postgres. Back that up at the volume level — e.g. `docker run --rm -v arutech-workspace-uploads-data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .` — or switch to `STORAGE_PROVIDER=s3` (real code, see `S3StorageProvider`), where the bucket provider's own backup/versioning story applies instead.
- **Redis** — deliberately not backed up. It holds BullMQ queue state (a due-but-unprocessed reminder — acceptable to lose, the reminder just fires late on next scheduler tick, not silently) and short-lived WS tickets (30s TTL — never worth persisting). Nothing in Redis is a source of truth.

## Usage

```bash
# Backup — dumps the running postgres container to backups/ (gitignored)
./scripts/backup-postgres.sh                                    # dev defaults
./scripts/backup-postgres.sh arutech-workspace-postgres arutech_workspace arutech   # explicit, matches prod too

# Restore — ALWAYS requires an explicit target database name, no default.
# Prompts for confirmation (retype the target name) before touching anything.
./scripts/restore-postgres.sh backups/arutech-workspace-<timestamp>.dump <target-db-name>
```

Restoring into an already-existing database drops and recreates every object the backup contains (`pg_restore --clean --if-exists`) — appropriate for a scratch/staging target restored into on purpose, destructive against a live one. The script does not try to detect "is this production" — that judgment is entirely in what target name you type, which is why it asks you to retype it as confirmation.

## Verified, for real, in this repo's dev environment

Both scripts were run end-to-end against the real dev Postgres (`docker-compose.dev.yml`), not just written and assumed to work:

1. `backup-postgres.sh` against the live dev database — produced a real `.dump` file.
2. `restore-postgres.sh` with that file, into a genuine scratch database (`arutech_workspace_restore_test`).
3. `SELECT COUNT(*)` (a real row count, not `pg_stat_user_tables`'s `n_live_tup` — that's just a stale planner estimate that needs `ANALYZE` to be trustworthy, and gave misleadingly different numbers between source and restored DB on the first attempt) across every one of the 29 tables — **identical between source and restored database.**
4. Scratch database dropped afterward, no residue left.

That's the actual bar this file's process was held to, not "the command exited 0."

## Retention

`backup-postgres.sh` prunes its own output older than 14 days on every run (only files matching its own naming pattern — never touches anything else in `backups/`). Adjust the `-mtime +14` in the script if a different window is wanted. For anything beyond local retention (off-host copies, longer retention, point-in-time recovery), that's real infrastructure work tied to whatever the actual Lightsail host's storage/backup options turn out to be — not decidable in advance of `LIGHTSAIL.md`'s inspection step.

## Scheduling (once a real host exists)

A host-level cron entry, not a GitHub Action — a scheduled Action would need network access to a Postgres port that's deliberately *not* published to the internet (`docker-compose.prod.yml` binds no host port for `postgres`), so it'd need to either open that port (against `LIGHTSAIL.md`'s hard rules) or SSH in anyway, at which point a plain cron entry is strictly simpler:

```cron
# Daily at 02:00 server time
0 2 * * * cd /opt/arutech-workspace && ./scripts/backup-postgres.sh >> /var/log/arutech-workspace-backup.log 2>&1
```

Not installed anywhere by this repo — a line for whoever completes the real Lightsail setup to add.
