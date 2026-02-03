import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

export function requestLogger(logger: winston.Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = (req as any).id;

    // Log request
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: req.query,
      request_id: requestId,
      ip: req.ip,
      user_agent: req.get('user-agent'),
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (body: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log response
      if (statusCode >= 500) {
        logger.error('Request completed with error', {
          method: req.method,
          path: req.path,
          status_code: statusCode,
          duration_ms: duration,
          request_id: requestId,
        });
      } else if (statusCode >= 400) {
        logger.warn('Request completed with client error', {
          method: req.method,
          path: req.path,
          status_code: statusCode,
          duration_ms: duration,
          request_id: requestId,
        });
      } else {
        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          status_code: statusCode,
          duration_ms: duration,
          request_id: requestId,
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
}
