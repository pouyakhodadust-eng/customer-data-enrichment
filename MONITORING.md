# Monitoring & Observability Guide

## Overview

The Customer Data Enrichment Engine includes a comprehensive monitoring stack for observability.

## Stack Components

| Component | Purpose | Port |
|-----------|---------|------|
| Prometheus | Metrics collection | 9090 |
| Grafana | Visualization | 3000 |
| AlertManager | Alert routing | 9093 |

## Accessing Dashboards

### Grafana
```bash
# URL: http://localhost:3000
# Default credentials: admin/admin
```

### Prometheus
```bash
# URL: http://localhost:9090
# Query metrics directly using PromQL
```

## Key Metrics

### API Metrics
| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_request_duration_seconds` | Request latency | P95 > 2s |
| `http_requests_total` | Request count by status | 5xx > 5% |
| `enrichment_duration_seconds` | Enrichment operation time | > 5s |

### Business Metrics
| Metric | Description |
|--------|-------------|
| `leads_total` | Total number of leads |
| `leads_enriched_total` | Enriched leads count |
| `lead_score_total` | Average lead score |
| `lead_conversion_rate` | Conversion rate |

### Database Metrics
| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `pg_up` | Database availability | = 0 |
| `pg_connections` | Active connections | > 90% of max |

## Dashboards

### Main Dashboard
Access: Grafana → Dashboards → Main Dashboard

Features:
- Total leads overview
- Score distribution
- Pipeline stages
- Lead sources breakdown
- Conversion funnel

### API Dashboard
Access: Grafana → Dashboards → API Dashboard

Features:
- Request rate
- Response latency (P50, P90, P95, P99)
- Error rates
- Enrichment performance

## Alerting

### Alert Rules

Located in `monitoring/rules.yml`:

```yaml
groups:
  - name: enrichment-alerts
    rules:
      # High error rate
      - alert: APIHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High API error rate"
      
      # Database down
      - alert: PostgresDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
      
      # Hot lead threshold
      - alert: NoNewLeads
        expr: increase(leads_total[1h]) == 0
        for: 2h
        labels:
          severity: warning
```

### Alert Notifications

Configure AlertManager in `monitoring/alertmanager.yml`:

```yaml
route:
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: alerts@example.com
        send_resolved: true
  
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: YOUR_PAGERDUTY_KEY
```

## Log Aggregation

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last hour
docker-compose logs --since 1h api
```

### Log Levels

Configure in `.env`:
```env
LOG_LEVEL=info  # debug, info, warn, error
```

## Custom Metrics

### Adding Custom Metrics

In your code:
```typescript
import { Counter, Histogram } from 'prom-client';

const leadCounter = new Counter({
  name: 'leads_created_total',
  help: 'Total number of leads created',
  labelNames: ['source'],
});

const enrichmentDuration = new Histogram({
  name: 'enrichment_duration_seconds',
  help: 'Duration of enrichment operations',
  labelNames: ['provider'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Use in code
leadCounter.inc({ source: 'website' });
enrichmentDuration.observe({ provider: 'clearbit' }, 1.5);
```

### Exposing Metrics

Metrics are automatically exposed at `/metrics` endpoint.

## Performance Monitoring

### Database Query Performance

```sql
-- Slow query log (enable in PostgreSQL)
SET log_min_duration_statement = 1000;

-- Query analysis
EXPLAIN ANALYZE SELECT * FROM leads WHERE status = 'qualified';
```

### API Performance

```bash
# Test API response time
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/v1/leads
```

## Health Checks

### Available Endpoints

| Endpoint | Description |
|----------|-------------|
| `/health` | Full health check with dependencies |
| `/health/live` | Liveness probe |
| `/health/ready` | Readiness probe |
| `/metrics` | Prometheus metrics |

### Sample Health Response
```json
{
  "status": "healthy",
  "timestamp": "2024-02-03T22:00:00Z",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

## Troubleshooting

### Dashboard Not Loading
1. Check Prometheus is running
2. Verify data source configuration in Grafana
3. Check Grafana logs: `docker-compose logs grafana`

### Missing Metrics
1. Check API is exposing `/metrics`
2. Verify Prometheus scrape configuration
3. Check service is running

### Alerts Not Firing
1. Verify AlertManager is running
2. Check alert rule syntax
3. Review Prometheus alerts page
