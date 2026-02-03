import Redis from 'ioredis';
import { loadConfig } from './config';

let redis: Redis | null = null;

export async function setupRedis(config: any): Promise<Redis> {
  redis = new Redis({
    host: config.host,
    port: config.port,
    password: config.password || undefined,
    db: config.db || 0,
    keyPrefix: config.key_prefix || 'enrichment:',
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redis.on('connect', () => {
    console.log('Redis connected successfully');
  });

  // Test connection
  await redis.ping();
  
  return redis;
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not initialized. Call setupRedis first.');
  }
  return redis;
}

// Cache operations
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
  const redis = getRedis();
  const serialized = JSON.stringify(value);
  
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

export async function deleteCache(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Rate limiting
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const rateKey = `ratelimit:${key}`;
  
  // Remove old entries
  await redis.zremrangebyscore(rateKey, 0, windowStart);
  
  // Count current requests
  const count = await redis.zcard(rateKey);
  
  if (count >= maxRequests) {
    const oldest = await redis.zrange(rateKey, 0, 0, 'WITHSCORES');
    const resetAt = oldest[1] ? parseInt(oldest[1]) + windowMs : now + windowMs;
    return { allowed: false, remaining: 0, resetAt };
  }
  
  // Add current request
  await redis.zadd(rateKey, now, `${now}-${Math.random()}`);
  await redis.expire(rateKey, Math.ceil(windowMs / 1000));
  
  return { allowed: true, remaining: maxRequests - count - 1, resetAt: now + windowMs };
}

// Queue operations (for BullMQ)
export function getQueueName(name: string): string {
  return `bull:${name}`;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('Redis connection closed');
  }
}
