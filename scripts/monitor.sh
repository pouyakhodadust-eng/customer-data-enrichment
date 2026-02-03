#!/bin/bash
# Monitor Script - System Health and Metrics
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📊 Customer Data Enrichment - System Monitor"
echo "=============================================="
echo ""

# Function to check service status
check_service() {
    local service=$1
    local status=$(docker-compose ps -q "$service" 2>/dev/null)
    
    if [ -z "$status" ]; then
        echo "  ✗ $service: Not running"
        return 1
    fi
    
    local healthy=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null)
    if [ "$healthy" = "healthy" ]; then
        echo "  ✓ $service: Healthy"
        return 0
    else
        echo "  ⚠ $service: Running (not healthy)"
        return 0
    fi
}

# Service Status
echo "🔍 Service Status:"
echo ""
check_service "postgres"
check_service "redis"
check_service "api"
check_service "frontend"
check_service "n8n"
check_service "prometheus"
check_service "grafana"

echo ""

# Resource Usage
echo "💻 Resource Usage:"
echo ""

# CPU and Memory
echo "Container Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
    enrichment-postgres enrichment-redis enrichment-api enrichment-frontend \
    enrichment-n8n enrichment-prometheus enrichment-grafana 2>/dev/null || echo "  (Unable to fetch stats)"

echo ""

# Database Statistics
echo "📈 Database Statistics:"
echo ""
echo "  Connection count:"
docker-compose exec -T postgres psql -U enrichment_user -d enrichment_db -c "
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;" 2>/dev/null || echo "  (Unable to connect)"

echo ""
echo "  Table sizes:"
docker-compose exec -T postgres psql -U enrichment_user -d enrichment_db -c "
SELECT relname, pg_size_pretty(pg_relation_size(relid)) as size
FROM pg_stat_user_tables
ORDER BY pg_relation_size(relid) DESC
LIMIT 5;" 2>/dev/null || echo "  (Unable to connect)"

echo ""

# API Metrics
echo "🌐 API Metrics:"
echo ""
echo "  Request count (last hour):"
curl -s "http://localhost:3000/metrics" 2>/dev/null | grep "http_requests_total" | tail -5 || echo "  (Unable to fetch metrics)"

echo ""

# Recent Errors
echo "⚠️ Recent Errors (last hour):"
echo ""
docker-compose logs --since 1h api 2>/dev/null | grep -i "error" | tail -10 || echo "  No recent errors"

echo ""

# Last Backup
echo "🗄️ Backup Status:"
echo ""
LATEST_BACKUP=$(ls -la "$SCRIPT_DIR/backups"/enrichment_db_*.sql.gz 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    echo "  Latest backup: $LATEST_BACKUP"
    echo "  Age: $(echo $(($(date +%s) - $(date -r "$LATEST_BACKUP" +%s))) | awk '{printf "%d hours %d minutes", $1/3600, ($1%3600)/60}')"
else
    echo "  No backups found"
fi

echo ""
echo "=============================================="
echo "✅ System check complete!"
