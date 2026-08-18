#!/usr/bin/env bash
# Arutech Workspace — Postgres backup.
#
# Runs pg_dump INSIDE the postgres container (via `docker exec`), so it
# needs no local psql/pg_dump install on the host — only Docker. Produces
# a timestamped custom-format (-Fc) dump, restorable with pg_restore (see
# restore-postgres.sh) or `pg_restore -l` to inspect its contents first.
#
# Usage:
#   ./scripts/backup-postgres.sh [container-name] [db-name] [db-user]
# Defaults match docker-compose.dev.yml's dev stack — pass explicit
# arguments for the production stack (arutech-workspace-postgres is the
# same container name in both dev and prod, so the default often works
# there too; db-name/db-user must match .env.production's POSTGRES_DB/USER
# if they were ever changed from the .env.production.example defaults).
#
# See BACKUPS.md for retention policy, restore steps, and — importantly —
# why this alone is NOT a complete backup story (local-disk file uploads
# need separate, volume-level backup; this only covers Postgres).
set -euo pipefail

CONTAINER="${1:-arutech-workspace-postgres}"
DB_NAME="${2:-arutech_workspace}"
DB_USER="${3:-arutech}"

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/arutech-workspace-${TIMESTAMP}.dump"

echo "Backing up '$DB_NAME' from container '$CONTAINER' -> $OUT_FILE"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "Done: $OUT_FILE ($SIZE)"

# Prune anything older than 14 days — adjust to your actual retention
# policy (see BACKUPS.md). Only touches files matching this script's own
# naming pattern, never anything else in $BACKUP_DIR.
find "$BACKUP_DIR" -maxdepth 1 -name "arutech-workspace-*.dump" -mtime +14 -print -delete
