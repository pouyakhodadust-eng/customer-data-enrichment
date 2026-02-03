#!/bin/bash
# Database Restore Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"

echo "🗄️ Database Restore Script"
echo "=========================="
echo ""

# List available backups
echo "📦 Available Backups:"
echo ""
ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -10
echo ""

# Get user input
read -p "Enter backup file to restore (or press Enter for latest): " BACKUP_FILE

if [ -z "$BACKUP_FILE" ]; then
    # Get latest backup
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/enrichment_db_*.sql.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "✗ No backup files found in $BACKUP_DIR"
        exit 1
    fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "✗ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite existing data!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Load environment variables
if [ -f "$SCRIPT_DIR/../.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../.env" | xargs)
fi

# Stop services that might write to database
echo ""
echo "Stopping write-heavy services..."
docker-compose stop api n8n 2>/dev/null || true

# Restore PostgreSQL
echo ""
echo "Restoring PostgreSQL database from: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U ${POSTGRES_USER:-enrichment_user} -d ${POSTGRES_DB:-enrichment_db}
echo "✓ PostgreSQL database restored"

# Restore Redis (optional)
echo ""
read -p "Restore Redis backup? (yes/no): " RESTORE_REDIS
if [ "$RESTORE_REDIS" = "yes" ]; then
    REDIS_BACKUP=$(ls -t "$BACKUP_DIR"/redis_*.rdb.gz 2>/dev/null | head -1)
    if [ -n "$REDIS_BACKUP" ]; then
        echo "Restoring Redis from: $REDIS_BACKUP"
        gunzip -c "$REDIS_BACKUP" | docker-compose exec -T redis redis-cli BGSAVE
        echo "✓ Redis restored"
    else
        print_warning "No Redis backup found"
    fi
fi

# Restart services
echo ""
echo "Restarting services..."
docker-compose start api n8n 2>/dev/null || true

echo ""
echo "✅ Restore complete!"
echo ""
echo "📝 Note: You may need to restart the entire stack for all changes to take effect:"
echo "   docker-compose restart"
