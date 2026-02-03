#!/bin/bash
# Database Backup Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

echo "🗄️ Database Backup - $(date)"
echo "============================="

# Load environment variables
if [ -f "$SCRIPT_DIR/../.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../.env" | xargs)
fi

# PostgreSQL backup
BACKUP_FILE="$BACKUP_DIR/enrichment_db_$DATE.sql.gz"

echo "Backing up PostgreSQL database..."
docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-enrichment_user} ${POSTGRES_DB:-enrichment_db} | gzip > "$BACKUP_FILE"

# Get file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✓ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Redis backup
REDIS_BACKUP="$BACKUP_DIR/redis_$DATE.rdb.gz"
echo "Backing up Redis..."
docker-compose exec -T redis redis-cli BGSAVE
sleep 2
docker-compose exec -T redis cat /data/dump.rdb | gzip > "$REDIS_BACKUP"
echo "✓ Redis backup created: $REDIS_BACKUP"

# Keep only last 7 backups
echo ""
echo "🧹 Cleaning up old backups (keeping last 7)..."
ls -t "$BACKUP_DIR"/enrichment_db_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
ls -t "$BACKUP_DIR"/redis_*.rdb.gz 2>/dev/null | tail -n +8 | xargs -r rm

# List current backups
echo ""
echo "📦 Current Backups:"
ls -lh "$BACKUP_DIR" | grep -E "(enrichment_db|redis)" | tail -10

echo ""
echo "✅ Backup complete!"
