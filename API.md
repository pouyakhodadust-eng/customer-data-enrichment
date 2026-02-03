# API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

All API endpoints require authentication via JWT token.

### Getting a Token
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### Using the Token
Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Endpoints

### Health Check

**GET /health**
```bash
curl http://localhost:3000/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-02-03T22:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

---

### Leads

#### List Leads
```bash
GET /api/v1/leads
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page |
| status | string | - | Filter by status |
| source | string | - | Filter by source |
| min_score | number | - | Minimum score |
| max_score | number | - | Maximum score |
| search | string | - | Search query |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "lead@example.com",
      "first_name": "John",
      "last_name": "Smith",
      "company_name": "Acme Inc",
      "job_title": "CTO",
      "source": "website",
      "status": "qualified",
      "total_score": 85.5,
      "demographic_score": 90,
      "firmographic_score": 82,
      "behavioral_score": 78,
      "engagement_score": 88,
      "created_at": "2024-02-03T20:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

#### Get Single Lead
```bash
GET /api/v1/leads/{id}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "lead@example.com",
  "first_name": "John",
  "last_name": "Smith",
  "company_name": "Acme Inc",
  "job_title": "CTO",
  "phone": "+1-555-0100",
  "source": "website",
  "status": "qualified",
  "tags": ["enterprise", "high-value"],
  "metadata": {
    "utm_source": "google"
  },
  "total_score": 85.5,
  "score_breakdown": {
    "company_size_bonus": 20,
    "title_weight": 25,
    "engagement_level": 30
  },
  "organization": {
    "name": "Acme Inc",
    "industry": "Technology",
    "company_size": "100-500"
  },
  "created_at": "2024-02-03T20:00:00Z",
  "updated_at": "2024-02-03T22:00:00Z"
}
```

#### Create Lead
```bash
POST /api/v1/leads
Content-Type: application/json

{
  "email": "new.lead@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "company_name": "Startup.io",
  "job_title": "CEO",
  "source": "referral",
  "tags": ["startup", "founder"]
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "email": "new.lead@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "company_name": "Startup.io",
  "job_title": "CEO",
  "source": "referral",
  "status": "new",
  "created_at": "2024-02-03T22:00:00Z"
}
```

#### Update Lead
```bash
PUT /api/v1/leads/{id}
Content-Type: application/json

{
  "status": "contacted",
  "notes": "Had initial discovery call"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "status": "contacted",
  "notes": "Had initial discovery call",
  "updated_at": "2024-02-03T22:30:00Z"
}
```

#### Enrich Lead
```bash
POST /api/v1/leads/{id}/enrich
Content-Type: application/json

{
  "provider": "clearbit"
}
```

**Response (200 OK):**
```json
{
  "message": "Lead enriched successfully",
  "enriched": true,
  "data": {
    "person": {
      "name": "John Smith",
      "linkedin": "https://linkedin.com/in/johnsmith",
      "bio": "Tech executive with 15 years experience"
    },
    "company": {
      "name": "Acme Inc",
      "industry": "Technology",
      "employees": 250
    }
  }
}
```

#### Delete Lead
```bash
DELETE /api/v1/leads/{id}
```

**Response (200 OK):**
```json
{
  "message": "Lead deleted successfully"
}
```

---

### Statistics

#### Get Overview Statistics
```bash
GET /api/v1/leads/stats/overview
```

**Response (200 OK):**
```json
{
  "total_leads": 150,
  "new_leads": 25,
  "qualified_leads": 45,
  "converted_leads": 30,
  "avg_score": 62.5,
  "hot_leads": 35,
  "warm_leads": 65,
  "cold_leads": 50,
  "active_sources": 6
}
```

---

### Webhooks

#### Lead Created Webhook
```bash
POST /webhooks/lead/created
Content-Type: application/json

{
  "lead": {
    "email": "webhook.lead@example.com",
    "first_name": "Web",
    "last_name": "Hook",
    "company_name": "WebCorp",
    "source": "landing_page"
  }
}
```

#### Engagement Webhook
```bash
POST /webhooks/engagement
Content-Type: application/json

{
  "lead_id": "uuid",
  "engagement_type": "demo_completed",
  "channel": "video",
  "subject": "Product Demo",
  "duration": 3600
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": {
    "field": "Validation error details"
  },
  "request_id": "req_abc123"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Limit**: 100 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Versioning

API versioning is through the URL path: `/api/v1/`

Breaking changes will result in a new version (e.g., `/api/v2/`)

---

## Response Codes

### Lead Status Values
- `new` - New lead
- `contacted` - Initial contact made
- `qualified` - Lead qualified
- `proposal` - Proposal sent
- `negotiation` - In negotiation
- `won` - Deal won
- `lost` - Deal lost
- `churned` - Customer churned

### Lead Source Values
- `website` - Website form
- `referral` - Referral
- `linkedin` - LinkedIn
- `social` - Social media
- `email` - Email campaign
- `paid_ads` - Paid advertising
- `organic` - Organic search
- `partner` - Partner referral
- `event` - Event/Conference
- `other` - Other source
