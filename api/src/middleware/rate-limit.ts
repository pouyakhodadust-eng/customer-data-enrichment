import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { loadConfig } from '../utils/config';

export function rateLimiter(config: any) {
  return rateLimit({
    windowMs: config.window_ms,
    max: config.max_requests,
    message: {
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again later.`,
      retry_after: Math.ceil(config.window_ms / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use IP address for rate limiting
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/health/live') {
        return true;
      }
      return false;
    },
    handler: (req: Request, res: Response, next: NextFunction, options) => {
      res.status(429).json({
        error: options.message.error,
        message: options.message.message,
        retry_after: options.message.retry_after,
      });
    },
  });
}
