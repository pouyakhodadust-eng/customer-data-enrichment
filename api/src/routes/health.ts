import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../utils/database';

const router = Router();

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: boolean;
    redis: boolean;
  };
}

let startTime = Date.now();

router.get('/', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    // Check database
    await query('SELECT 1');
    checks.database = true;
  } catch (error) {
    checks.database = false;
  }

  try {
    // Check Redis
    const { getRedis } = require('../utils/redis');
    const redis = getRedis();
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    checks.redis = false;
  }

  const allHealthy = Object.values(checks).every(v => v);
  const anyHealthy = Object.values(checks).some(v => v);

  const result: HealthCheckResult = {
    status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(result);
});

router.get('/live', (req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    await query('SELECT 1');
    const { getRedis } = require('../utils/redis');
    const redis = getRedis();
    await redis.ping();
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: 'Dependencies not ready' });
  }
});

export { router as healthRouter };
