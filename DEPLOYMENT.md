# Deployment Guide

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- 4GB+ RAM
- 10GB+ disk space
- Git

## Quick Deployment

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/customer-data-enrichment.git
cd customer-data-enrichment
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env
```

Required environment variables:
```env
# Database
POSTGRES_USER=enrichment_user
POSTGRES_PASSWORD=change_this_password
POSTGRES_DB=enrichment_db

# API
API_PORT=3000
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=production

# Enrichment API Keys
CLEARBIT_KEY=your-clearbit-key
HUNTER_KEY=your-hunter-key
FULLCONTACT_KEY=your-fullcontact-key

# n8n
N8N_USER=admin
N8N_PASSWORD=change_n8n_password
N8N_ENCRYPTION_KEY=your-32-char-encryption-key

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=change_grafana_password
```

### 3. Start Services
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This will:
- Build all Docker images
- Start all services
- Run database migrations
- Seed sample data
- Verify health

### 4. Verify Deployment
```bash
# Check service status
docker-compose ps

# Check API health
curl http://localhost:3000/health

# Check logs
docker-compose logs -f api
```

## Production Deployment

### Docker Swarm Mode

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml enrichment

# Verify deployment
docker service ls
```

### Kubernetes

For Kubernetes deployment, see the `k8s/` directory for manifests:
```bash
kubectl apply -f k8s/
```

### Manual Production Setup

1. **SSL/TLS Setup**
```bash
# Generate SSL certificate (using Let's Encrypt)
certbot --nginx -d yourdomain.com

# Or use self-signed for testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem
```

2. **Update Nginx Configuration**
Edit `config/nginx.conf` with your SSL certificates and domain.

3. **Production Environment**
```env
NODE_ENV=production
LOG_LEVEL=info
```

4. **Start Services**
```bash
docker-compose -f docker-compose.yml up -d
```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| API | 3000 | REST API |
| Frontend | 8080 | Dashboard UI |
| n8n | 5678 | Workflow Editor |
| Prometheus | 9090 | Metrics |
| Grafana | 3000 | Dashboards |

## Health Checks

All services include health checks:

```bash
# API health
curl http://localhost:3000/health

# Database health
docker-compose exec postgres pg_isready -U enrichment_user

# Redis health
docker-compose exec redis redis-cli ping
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres psql -U enrichment_user -d enrichment_db
```

### Redis Memory Issues
```bash
# Check Redis memory
docker-compose exec redis redis-cli info memory

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHALL
```

### API Not Responding
```bash
# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

## Backup and Recovery

### Backup
```bash
./scripts/backup.sh
```

Backups are stored in `scripts/backups/`

### Restore
```bash
./scripts/restore.sh
```

## Scaling

### Horizontal Scaling (API)
```bash
docker-compose scale api=3
```

### Database Read Replicas
See `migrations/003_read_replica.sql` for setup.

## Monitoring

### Access Dashboards
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090

### Key Metrics
- API response time (P95 < 100ms)
- Enrichment success rate (>95%)
- Lead conversion rate
- Database connection usage

## Security Recommendations

1. **Change all default passwords**
2. **Enable SSL/TLS**
3. **Configure firewall rules**
4. **Enable audit logging**
5. **Regular security updates**
6. **Use secrets management** (Vault, AWS Secrets Manager)
