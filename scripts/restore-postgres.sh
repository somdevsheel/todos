#!/usr/bin/env bash
# Arutech Workspace — Postgres restore.
#
# Restores a backup produced by backup-postgres.sh into an EXPLICITLY named
# target database — there is no default target, and the script refuses to
# run without one. This is deliberate: a restore script that could
# silently target "whatever the default DB is" is one typo away from
# overwriting a live database. You always say exactly what you're
# restoring into.
#
# Usage:
#   ./scripts/restore-postgres.sh <backup-file> <target-db-name> [container-name] [db-user]
#
# The target database is created if it doesn't already exist. If it DOES
# already exist, pg_restore's --clean --if-exists drops and recreates
# every object it's about to restore — appropriate for a scratch/staging
# target you're restoring INTO on purpose, catastrophic against a live one.
# This script does not attempt to detect "is this actually a production
# database" — that judgment call is the caller's, made by which target
# name they typed.
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <backup-file> <target-db-name> [container-name] [db-user]" >&2
  echo "" >&2
  echo "No default target database — you must name exactly what you're restoring into." >&2
  exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="$2"
CONTAINER="${3:-arutech-workspace-postgres}"
DB_USER="${4:-arutech}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "Restoring $BACKUP_FILE into database '$TARGET_DB' on container '$CONTAINER' (user: $DB_USER)"
echo "This will DROP and recreate every object already in '$TARGET_DB' that the backup also contains."
read -r -p "Type the target database name to confirm: " CONFIRM
if [ "$CONFIRM" != "$TARGET_DB" ]; then
  echo "Confirmation didn't match '$TARGET_DB' — aborting, nothing was touched." >&2
  exit 1
fi

# Create the target DB if it doesn't already exist — `|| true` because
# `createdb` exits non-zero if it already does, which is the expected,
# fine case (restoring into an existing scratch/staging DB on purpose).
docker exec "$CONTAINER" createdb -U "$DB_USER" "$TARGET_DB" 2>/dev/null || true

docker exec -i "$CONTAINER" pg_restore -U "$DB_USER" -d "$TARGET_DB" --clean --if-exists --no-owner < "$BACKUP_FILE"

echo "Restore complete into '$TARGET_DB'."
