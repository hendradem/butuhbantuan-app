#!/bin/bash
# ButuhBantuan — daily MySQL backup.
# Installed to /usr/local/sbin/bb-mysql-backup by setup-vps.sh and invoked
# from /etc/cron.daily/bb-mysql-backup. Retains 7 days locally.

set -euo pipefail

DB_NAME="butuhbantuan"
DB_USER="bb"
CRED_FILE="/opt/butuhbantuan/api/.db-credentials"
BACKUP_DIR="/opt/butuhbantuan/backups"
RETENTION_DAYS=7

log() { logger -t bb-mysql-backup "$*"; echo "[bb-mysql-backup] $*"; }
die() { log "ERROR: $*"; exit 1; }

[[ -f "$CRED_FILE" ]] || die "Missing $CRED_FILE (created by setup-vps.sh)"

DB_PASS=$(cat "$CRED_FILE")
mkdir -p "$BACKUP_DIR"

STAMP=$(date -u +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"

log "Dumping $DB_NAME → $OUT"
mysqldump \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  "$DB_NAME" \
  | gzip -9 > "$OUT"

# Retain last N days
find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}-*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Sanity: warn if backup is suspiciously small (<1 KB → likely failed)
SIZE=$(stat -c%s "$OUT" 2>/dev/null || echo 0)
if [[ "$SIZE" -lt 1024 ]]; then
  die "Backup file too small ($SIZE bytes) — dump likely failed"
fi

log "OK ($SIZE bytes, retention ${RETENTION_DAYS}d)"
