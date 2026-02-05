# Multi-Provider API Orchestration Design

## Problem
Orchestrate calls to 4+ enrichment APIs with:
- Different rate limits per provider
- Different pricing per request
- Automatic fallback when providers fail or exhaust quota
- Cost tracking per provider
- Schema normalization

## Providers
| Provider | Rate Limit | Cost/Req | Best For |
|----------|------------|----------|----------|
| Hunter   | 50/min     | ~$0.01   | Email verification |
| Clearbit | TBD        | ~$0.05   | Company data |
| FullContact | TBD     | ~$0.03   | Persona enrichment |
| Apollo   | TBD        | ~$0.02   | B2B database |

## Architecture

### 1. Provider Registry
```typescript
interface ProviderConfig {
  name: string;
  baseUrl: string;
  rateLimit: { requests: number; windowMs: number };
  costPerRequest: number;
  priority: number; // 0 = highest
  timeout: number;
}

const providers: ProviderConfig[] = [
  { name: 'hunter', rateLimit: { requests: 50, windowMs: 60000 }, costPerRequest: 0.01, priority: 0, ... },
  { name: 'clearbit', rateLimit: { requests: 200, windowMs: 60000 }, costPerRequest: 0.05, priority: 1, ... },
  // ...
];
```

### 2. Rate Limiter (per provider)
Using BullMQ with Redis for distributed rate limiting:
- Token bucket algorithm per provider
- Automatic backoff when rate limited
- Queue pauses/resumes based on remaining quota

```typescript
class ProviderRateLimiter {
  private tokenBucket: Map<string, number> = new Map();
  private lastRefill: Map<string, number> = new Map();

  async acquire(provider: string): Promise<boolean> {
    const config = getProviderConfig(provider);
    const now = Date.now();
    const windowMs = config.rateLimit.windowMs;

    // Refill tokens
    const lastRefillTime = this.lastRefill.get(provider) || 0;
    const elapsed = now - lastRefillTime;
    const tokensToAdd = Math.floor(elapsed / windowMs) * config.rateLimit.requests;

    const currentTokens = Math.min(
      (this.tokenBucket.get(provider) || config.rateLimit.requests) + tokensToAdd,
      config.rateLimit.requests
    );

    if (currentTokens >= 1) {
      this.tokenBucket.set(provider, currentTokens - 1);
      this.lastRefill.set(provider, now);
      return true;
    }

    return false; // Rate limited
  }
}
```

### 3. Fallback Chain
```typescript
async function enrichWithFallback(domain: string): Promise<EnrichmentResult> {
  const providers = getProvidersByPriority();

  for (const provider of providers) {
    if (await rateLimiter.acquire(provider.name)) {
      try {
        const result = await callProvider(provider, domain);

        // Track cost
        costTracker.record(provider.name, provider.costPerRequest);

        // Normalize schema
        return normalizeToCanonicalSchema(result, provider.name);
      } catch (error) {
        if (isExhausted(error) || isRateLimited(error)) {
          continue; // Try next provider
        }
        throw error;
      }
    }
  }

  throw new Error('All providers exhausted');
}
```

### 4. Cost Tracking
```typescript
class CostTracker {
  private dailyUsage: Map<string, { cost: number; requests: number }> = new Map();

  async record(provider: string, cost: number) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${provider}:${today}`;

    const current = this.dailyUsage.get(key) || { cost: 0, requests: 0 };
    this.dailyUsage.set(key, {
      cost: current.cost + cost,
      requests: current.requests + 1
    });
  }

  async getDailyCost(provider: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyUsage.get(`${provider}:${today}`)?.cost || 0;
  }
}
```

### 5. Schema Normalization
Two approaches:

**Option A: Late Binding (current approach)**
- Store raw data as JSONB in PostgreSQL
- Normalize on read/query
- Pros: Preserves original data, flexible
- Cons: Slower queries

**Option B: Canonical Schema (recommended for 100K+ records)**
- Transform to canonical schema on ingest
- Store only canonical format
- Index specific fields for queries
- Pros: Faster queries, consistent
- Cons: Data loss if normalization is wrong

```typescript
// Canonical schema
interface CanonicalEnrichment {
  domain: string;
  companyName?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: string;
  emails?: {
    email: string;
    type: 'professional' | 'generic';
    confidence: number;
  }[];
  linkedinUrl?: string;
  facebookUrl?: string;
  twitterHandle?: string;
}

// Normalization mapping
const normalizationMap: Record<string, Record<string, string>> = {
  hunter: {
    'data.domain': 'domain',
    'data.organization': 'companyName',
    'data.industry': 'industry',
  },
  clearbit: {
    'domain': 'domain',
    'name': 'companyName',
    'category.industry': 'industry',
  },
  // ...
};
```

## Files to Create
1. `api/src/services/providers/provider-registry.ts` - Provider configs
2. `api/src/services/providers/rate-limiter.ts` - Token bucket rate limiter
3. `api/src/services/providers/fallback-chain.ts` - Fallback orchestration
4. `api/src/services/providers/cost-tracker.ts` - Cost tracking
5. `api/src/services/providers/schema-normalizer.ts` - Schema normalization
6. `api/src/services/providers/index.ts` - Export all

## Queue Architecture (BullMQ)
```
enrichment:queue
├── job: enrich:domain:example.com
├── attempts: 3 (one per provider priority)
├── backoff: { type: 'exponential', delay: 1000 }
└── removeOnComplete: 100
```

## Metrics to Track
- Requests per provider per day
- Cost per provider per day
- Fallback rate (how often A → B → C)
- Success rate per provider
- Average latency per provider
