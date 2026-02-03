# Security Guide

## Overview

This document outlines security measures and best practices for the Customer Data Enrichment Engine.

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Network Security                                   │
│  - Firewall rules                                            │
│  - SSL/TLS encryption                                        │
│  - Rate limiting                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Application Security                               │
│  - JWT authentication                                        │
│  - Input validation                                          │
│  - CORS policies                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Data Security                                      │
│  - Encryption at rest                                        │
│  - Encrypted credentials                                     │
│  - Audit logging                                             │
└─────────────────────────────────────────────────────────────┘
```

## Authentication

### JWT Tokens

- **Access Token**: 24-hour expiration
- **Refresh Token**: 7-day expiration
- **Algorithm**: HS256

### Token Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "exp": 1707000000,
  "iat": 1706913600
}
```

### Secure Token Storage

```typescript
// Client-side (browser)
localStorage.setItem('access_token', token);
localStorage.setItem('refresh_token', refreshToken);

// Always use HTTPS
// Implement token refresh before expiration
```

## API Security

### Rate Limiting

| Endpoint | Rate Limit | Burst |
|----------|------------|-------|
| `/api/*` | 100/min | 20 |
| `/webhooks/*` | 1000/min | 50 |
| `/health/*` | Unlimited | - |

### Input Validation

All inputs are validated using express-validator:

```typescript
router.post('/leads', [
  body('email').isEmail().normalizeEmail(),
  body('first_name').trim().isLength({ min: 1, max: 100 }),
  body('source').isIn(['website', 'referral', 'linkedin', ...])
], validationHandler);
```

### CORS Configuration

```typescript
const corsOptions = {
  origin: config.cors.origins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  maxAge: 86400,
};
```

## Data Protection

### Sensitive Data Handling

| Data Type | Storage | Encryption |
|-----------|---------|------------|
| Passwords | PostgreSQL | bcrypt (hashed) |
| API Keys | PostgreSQL | AES-256-GCM |
| JWT Secrets | Environment | - |
| Database Credentials | Environment | - |

### Encryption

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

## GDPR Compliance

### Data Subject Rights

1. **Right to Access**: Export all data for a user
2. **Right to Rectification**: Update user data
3. **Right to Erasure**: Complete data removal
4. **Right to Portability**: Export in JSON format

### Data Retention

```sql
-- Automatic cleanup for old data
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '365 days';

DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL '30 days';
```

### Consent Management

```typescript
// Track consent
interface ConsentRecord {
  userId: string;
  consentType: string;
  grantedAt: Date;
  revokedAt?: Date;
}
```

## Security Headers

Helmet.js middleware provides:

- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Strict-Transport-Security`

## Audit Logging

### Logged Events

| Event | Description |
|-------|-------------|
| `user.login` | Successful authentication |
| `user.login_failed` | Failed authentication |
| `user.logout` | User logout |
| `lead.created` | New lead created |
| `lead.deleted` | Lead deleted |
| `data.exported` | Data export request |

### Audit Log Format

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "action": "lead.deleted",
  "resource_type": "lead",
  "resource_id": "uuid",
  "old_values": { "status": "new" },
  "new_values": { "status": "deleted" },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2024-02-03T22:00:00Z"
}
```

## Webhook Security

### Signature Verification

```typescript
function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Timestamp Validation

Webhooks older than 5 minutes are rejected:
```typescript
const MAX_AGE_MS = 5 * 60 * 1000;
const webhookAge = Date.now() - timestamp;
if (webhookAge > MAX_AGE_MS) {
  throw new Error('Webhook timestamp too old');
}
```

## Vulnerability Management

### Dependencies

Regular security scanning with Trivy:

```bash
trivy fs --severity HIGH,CRITICAL .
```

### Security Updates

```bash
# Update all dependencies
npm audit fix

# Update specific package
npm update package-name
```

## Incident Response

### Security Incident Types

| Severity | Example | Response Time |
|----------|---------|---------------|
| Critical | Data breach | 1 hour |
| High | Unauthorized access | 4 hours |
| Medium | Service degradation | 24 hours |
| Low | Minor vulnerability | 1 week |

### Response Steps

1. **Identify**: Detect and confirm incident
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore services
5. **Lessons Learned**: Document and improve

## Compliance Checklist

- [ ] HTTPS everywhere
- [ ] Strong password policies
- [ ] Multi-factor authentication
- [ ] Audit logging enabled
- [ ] Data encryption at rest
- [ ] Regular security updates
- [ ] Penetration testing
- [ ] Vulnerability scanning
- [ ] Incident response plan
- [ ] GDPR compliance
- [ ] Data retention policies

## Security Contacts

- Security issues: security@example.com
- Compliance: compliance@example.com
- Privacy: privacy@example.com
