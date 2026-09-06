#!/usr/bin/env bash
#
# Daily database dump, kept for two weeks.
#
# The database lives in a Docker volume on the server. If the server is lost,
# so is everything in it - quizzes can be re-scraped from Instagram, but user
# accounts, favourites and subscriptions cannot. This is the only copy that
# survives the machine.
#
# Install on the server (adjust the path if the repo lives elsewhere):
#   chmod +x ~/pub-quiz-v3/scripts/backup-db.sh
#   crontab -e
#   30 3 * * * /home/$USER/pub-quiz-v3/scripts/backup-db.sh >> /home/$USER/backup.log 2>&1
#
# Restore a dump:
#   gunzip -c ~/backups/pubquiz-YYYY-MM-DD.sql.gz | \
#     docker compose -f docker-compose.prod.yml exec -T mysql \
#     mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE"

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE="docker compose -f $REPO_DIR/docker-compose.prod.yml"

# DB_* credentials come from the compose env file next to the compose file.
if [ -f "$REPO_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$REPO_DIR/.env"
    set +a
fi

: "${DB_DATABASE:?DB_DATABASE not set - is $REPO_DIR/.env present?}"
: "${DB_USERNAME:?DB_USERNAME not set}"
: "${DB_PASSWORD:?DB_PASSWORD not set}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F)"
TARGET="$BACKUP_DIR/pubquiz-$STAMP.sql.gz"
TMP="$TARGET.partial"

echo "[$(date +'%F %T')] dumping $DB_DATABASE -> $TARGET"

# Write to a temp name first so an interrupted run cannot leave a truncated
# file that looks like a good backup.
$COMPOSE exec -T mysql \
    mysqldump -u"$DB_USERNAME" -p"$DB_PASSWORD" \
    --single-transaction --quick --no-tablespaces "$DB_DATABASE" \
    | gzip > "$TMP"

# A dump this small means mysqldump failed and wrote only an error.
if [ "$(stat -c%s "$TMP")" -lt 1024 ]; then
    rm -f "$TMP"
    echo "[$(date +'%F %T')] FAILED: dump too small, discarded" >&2
    exit 1
fi

mv "$TMP" "$TARGET"
find "$BACKUP_DIR" -name 'pubquiz-*.sql.gz' -mtime "+$KEEP_DAYS" -delete

echo "[$(date +'%F %T')] ok, $(du -h "$TARGET" | cut -f1), $(ls -1 "$BACKUP_DIR"/pubquiz-*.sql.gz | wc -l) kept"
