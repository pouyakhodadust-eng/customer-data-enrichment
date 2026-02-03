# Customer Data Enrichment Engine

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-yellow)
![Docker](https://img.shields.io/badge/docker-✓-blue)

A comprehensive lead enrichment platform that automatically enriches, scores, and manages customer data using AI-powered workflows.

[Features](#features) • [Quick Start](#-quick-start) • [Documentation](#documentation) • [API Reference](#api-reference)

</div>

---

## ✨ Features

### 🔍 Intelligent Data Enrichment
- **Multi-source enrichment**: Clearbit, Hunter, FullContact integration
- **Real-time enrichment**: Automatic data enhancement on lead creation
- **Batch processing**: Bulk enrichment for existing leads
- **Data validation**: Email verification and data quality scoring

### 📊 AI-Powered Lead Scoring
- **Multi-factor scoring**: Demographic, firmographic, behavioral, and engagement scores
- **ML ensemble model**: Combines multiple algorithms for accurate predictions
- **Customizable weights**: Adjust scoring factors based on your business
- **Score thresholds**: Automatic hot/warm/cold lead categorization

### ⚡ Workflow Automation
- **n8n integration**: Visual workflow builder for complex automation
- **Webhook support**: Real-time event processing
- **Custom triggers**: Event-based workflow execution
- **Error handling**: Automatic retries and dead-letter queues

### 📈 Analytics Dashboard
- **Real-time metrics**: Live dashboard with key performance indicators
- **Pipeline visualization**: Sales funnel and conversion tracking
- **Source attribution**: Track lead sources and ROI
- **Custom reports**: Build custom analytics views

### 🔒 Enterprise Security
- **JWT authentication**: Secure API access with tokens
- **Role-based access**: Granular permission controls
- **Audit logging**: Complete activity tracking
- **GDPR compliant**: Data retention and deletion controls

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- 4GB+ RAM
- 10GB+ disk space

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/customer-data-enrichment.git
cd customer-data-enrichment
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the platform**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

4. **Access the services**
| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:8080 | - |
| API | http://localhost:3000 | JWT Token |
| n8n | http://localhost:5678 | From .env |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin/admin |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](ARCHITECTURE.md) | System architecture and design decisions |
| [API Reference](API.md) | Complete API documentation |
| [Deployment Guide](DEPLOYMENT.md) | Production deployment instructions |
| [Monitoring Guide](MONITORING.md) | Metrics, alerts, and observability |
| [Security Guide](SECURITY.md) | Security best practices |
| [Operations Guide](OPERATIONS.md) | Day-to-day operations manual |
| [Research Notes](RESEARCH.md) | Technical research and patterns |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer (Nginx)                 │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │     API      │    │     n8n      │
│  (Dashboard) │    │  (Express)   │    │  Workflows   │
└──────────────┘    └──────────────┘    └──────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Redis      │    │  PostgreSQL  │    │   Prometheus │
│   (Cache)    │    │  (Database)  │    │   (Metrics)  │
└──────────────┘    └──────────────┘    └──────────────┘
                                              │
                                              ▼
                                    ┌──────────────┐
                                    │   Grafana    │
                                    │  (Dashboard) │
                                    └──────────────┘
```

---

## 📦 Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| API | Node.js + TypeScript | REST API backend |
| Frontend | Vanilla JS + Chart.js | Admin dashboard |
| Database | PostgreSQL 15 | Primary data store |
| Cache | Redis 7 | Caching & rate limiting |
| Workflow | n8n | Automation workflows |
| Monitoring | Prometheus + Grafana | Observability |
| Proxy | Nginx | Reverse proxy |

---

## 🔧 Configuration

### Environment Variables

```bash
# Database
POSTGRES_USER=enrichment_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=enrichment_db

# API
API_PORT=3000
JWT_SECRET=your-secret-key
NODE_ENV=production

# Enrichment Services
CLEARBIT_KEY=your-key
HUNTER_KEY=your-key
FULLCONTACT_KEY=your-key

# Frontend
FRONTEND_PORT=8080
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

---

## 📈 Performance

- **API Response Time**: < 100ms (P95)
- **Enrichment Time**: < 5s per lead
- **Database Connections**: Pool of 10
- **Cache TTL**: 1 hour default
- **Rate Limit**: 100 requests/minute

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [n8n](https://n8n.io/) for workflow automation
- [Clearbit](https://clearbit.com/) for data enrichment
- [Chart.js](https://www.chartjs.org/) for visualizations
# Customer Data Enrichment Engine

