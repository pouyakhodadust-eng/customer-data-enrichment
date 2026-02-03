# Architecture Documentation

## System Overview

The Customer Data Enrichment Engine is a microservices-style application built with Docker Compose, featuring a TypeScript API, React-like frontend dashboard, and n8n workflow automation.

## High-Level Architecture

```
                                    ┌─────────────────┐
                                    │   User Browser  │
                                    └────────┬────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Nginx Proxy                                 │
│                    (SSL Termination, Rate Limiting)                      │
└─────────────────────────────────────────────────────────────────────────┘
         │                         │                        │
         ▼                         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │      │      API        │     │      n8n        │
│   (Static)      │      │  (Express.js)   │     │  (Workflows)    │
└─────────────────┘      └────────┬────────┘     └─────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐     ┌─────────────────┐
│     Redis       │      │   PostgreSQL    │     │   Prometheus    │
│   (Cache/Queue) │      │   (Database)    │     │   (Metrics)     │
└─────────────────┘      └─────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │     Grafana     │
                                                 │  (Dashboards)   │
                                                 └─────────────────┘
```

## Component Details

### API Service
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with TypeORM/Prisma
- **Caching**: Redis with ioredis
- **Authentication**: JWT tokens with refresh tokens
- **Rate Limiting**: Token bucket algorithm

### Frontend Dashboard
- **Framework**: Vanilla JavaScript (no heavy framework)
- **Charts**: Chart.js for visualizations
- **Styling**: Custom CSS with CSS variables
- **Theme**: Dark/Light mode support

### n8n Workflow Engine
- **Database**: Shared PostgreSQL instance
- **Queue**: Redis for job processing
- **Custom Nodes**: Enrichment, scoring, notifications

### Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                        organizations                         │
│  (id, name, domain, industry, company_size, revenue, ...)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          contacts                           │
│  (id, org_id, email, name, job_title, linkedin, ...)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                           leads                             │
│  (id, contact_id, email, source, status, tags, ...)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        lead_scores                          │
│  (id, lead_id, total_score, breakdown, calculated_at)      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Lead Enrichment Flow
```
1. Lead created via API or Webhook
         │
         ▼
2. Validate and normalize data
         │
         ▼
3. Save to database (PostgreSQL)
         │
         ▼
4. Trigger enrichment workflow (n8n)
         │
         ▼
5. Call external enrichment APIs (Clearbit, Hunter, etc.)
         │
         ▼
6. Update contact/organization data
         │
         ▼
7. Calculate lead score
         │
         ▼
8. Save score to database
         │
         ▼
9. If hot lead → Notify sales (email/Slack)
```

### Scoring Algorithm
```
Total Score = (Demographic × 0.25) + 
              (Firmographic × 0.25) + 
              (Behavioral × 0.15) + 
              (Engagement × 0.35) + 
              (ML × 0.10)
```

## Security Architecture

### Authentication Flow
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│   API    │───▶│   JWT    │───▶│  Token   │
│          │    │ Gateway  │    │  Verify  │    │  Valid?  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                           │
                                           │ No
                                           ▼
                                    ┌──────────┐
                                    │  401     │
                                    │ Unauthorized
                                    └──────────┘
```

### Security Layers
1. **Network**: Nginx reverse proxy with SSL
2. **Transport**: HTTPS everywhere
3. **Application**: JWT authentication, rate limiting
4. **Database**: Password-protected, encrypted connections
5. **Data**: Encrypted credentials, PII protection

## Scalability Considerations

### Horizontal Scaling
- API can be replicated behind load balancer
- n8n workers can be added for processing
- Read replicas for database queries

### Vertical Scaling
- Increase database connection pool
- Add Redis memory
- Scale n8n worker resources

### Caching Strategy
```
┌─────────────────────────────────────────────────┐
│                   Cache Layers                   │
├─────────────────────────────────────────────────┤
│ L1: CDN (static assets)                         │
│ L2: Nginx (response caching)                    │
│ L3: Redis (query results, API responses)        │
│ L4: Database (query cache)                      │
└─────────────────────────────────────────────────┘
```

## Monitoring Stack

### Metrics Collection
- Prometheus scrapes API `/metrics`
- Custom business metrics exported
- Application performance monitoring

### Alerting
- AlertManager handles alerts
- PagerDuty integration ready
- Email notifications configured

### Dashboards
- Main dashboard (Grafana)
- API metrics dashboard (Grafana)
- Custom n8n dashboards
