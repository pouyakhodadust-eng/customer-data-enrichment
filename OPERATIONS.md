# Operations Guide

## Daily Operations

### Morning Checklist

1. **Check Dashboard**
   ```bash
   ./scripts/monitor.sh
   ```
   - Verify all services are healthy
   - Check overnight error rates
   - Review alert history

2. **Review Metrics**
   - Login to Grafana
   - Check main dashboard
   - Verify lead processing rates

3. **Check Alerts**
   - Review AlertManager
   - Acknowledge resolved alerts
   - Investigate new alerts

### Routine Tasks

#### Hourly
- Monitor API response times
- Check enrichment queue depth
- Review webhook success rates

#### Daily
- Review lead volume
- Check conversion metrics
- Monitor storage usage

#### Weekly
- Review performance trends
- Check backup status
- Update blocklists if needed

#### Monthly
- Security audit
- Capacity planning review
- Cost analysis

## Service Management

### Start Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose start api
```

### Stop Services
```bash
# Graceful shutdown
docker-compose down

# Stop without removing
docker-compose stop
```

### Restart Services
```bash
# Restart single service
docker-compose restart api

# Restart all
docker-compose restart
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last hour
docker-compose logs --since 1h api

# With timestamps
docker-compose logs -t api
```

## Database Operations

### Connection Pool

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check max connections
SHOW max_connections;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';
```

### Vacuum and Analyze

```sql
-- Manual vacuum (non-blocking)
VACUUM ANALYZE;

-- Aggressive vacuum (locks table)
VACUUM FULL ANALYZE;
```

### Performance Tuning

```sql
-- Check slow queries
SELECT query, 
       mean_time,
       calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Cache Management

### Redis Memory

```bash
# Check memory usage
docker-compose exec redis redis-cli info memory

# Clear all caches
docker-compose exec redis redis-cli FLUSHALL

# Clear specific cache
docker-compose exec redis redis-cli DEL enrichment:leads:list:*
```

### Cache Hit Ratio

```bash
docker-compose exec redis redis-cli INFO stats | grep keyspace_hits
```

## Backup Procedures

### Automated Backups

```bash
# Run manual backup
./scripts/backup.sh

# Verify backup
zcat backups/enrichment_db_20240203.sql.gz | head -100
```

### Restore from Backup

```bash
# List available backups
ls -la scripts/backups/

# Restore
./scripts/restore.sh scripts/backups/enrichment_db_20240203.sql.gz
```

## Troubleshooting

### Common Issues

#### API Not Responding
```bash
# Check API status
docker-compose ps api

# Check API logs
docker-compose logs --tail 100 api

# Restart API
docker-compose restart api
```

#### Database Connection Issues
```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready

# Check connection pool
docker-compose exec postgres psql -U enrichment_user -c "SELECT 1"
```

#### High Memory Usage
```bash
# Check container stats
docker stats

# Check Redis memory
docker-compose exec redis redis-cli info memory

# Restart services to clear memory
docker-compose restart
```

### Performance Issues

#### Slow API Response
1. Check database query performance
2. Review cache hit rates
3. Monitor API logs for errors

#### High Database Load
```sql
-- Check running queries
SELECT pid, usename, query, state
FROM pg_stat_activity
WHERE state = 'active';

-- Kill long-running query
SELECT pg_terminate_backend(pid);
```

## Capacity Planning

### Monitoring Growth

```sql
-- Leads by month
SELECT DATE_TRUNC('month', created_at) as month,
       COUNT(*) as new_leads
FROM leads
GROUP BY month
ORDER BY month DESC;

-- Storage growth
SELECT pg_size_pretty(pg_database_size('enrichment_db'));
```

### Scaling Triggers

| Metric | Warning | Critical |
|--------|---------|----------|
| API latency (P95) | > 1s | > 2s |
| Database connections | > 70% | > 90% |
| Redis memory | > 70% | > 90% |
| Disk usage | > 70% | > 85% |

## Escalation Procedures

### Level 1 (Self-Service)
- Restart stuck services
- Clear caches
- Review logs

### Level 2 (Operations)
- Database tuning
- Configuration changes
- Emergency deployments

### Level 3 (Engineering)
- Code fixes
- Architecture changes
- Security incidents

## Runbooks

### Runbook: High Error Rate
1. Check API logs for errors
2. Identify error pattern
3. Check external service status
4. Rollback recent changes if needed
5. Notify on-call engineer

### Runbook: Database Slow
1. Check running queries
2. Identify blocking queries
3. Kill long-running queries
4. Check for missing indexes
5. Contact DBA

### Runbook: Service Down
1. Check service health
2. Review recent deployments
3. Check infrastructure (AWS, etc.)
4. Attempt restart
5. Rollback if needed
6. Escalate to engineering

## On-Call

### Rotation Schedule
- Primary: Week 1
- Secondary: Week 2

### Response Times
| Severity | Response | Resolution |
|----------|----------|------------|
| Critical | 15 min | 1 hour |
| High | 1 hour | 4 hours |
| Medium | 4 hours | 24 hours |
| Low | 24 hours | 1 week |

### Contact Information
- PagerDuty: pd.example.com
- Slack: #ops-alerts
- Email: oncall@example.com
