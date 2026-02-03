import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(logger: winston.Logger) {
  return (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log error
    logger.error('Request error', {
      error: err.message,
      stack: err.stack,
      statusCode,
      method: req.method,
      path: req.path,
      request_id: (req as any).id,
    });

    // Don't leak error details in production
    const response: any = {
      error: statusCode === 500 ? 'Internal Server Error' : message,
      request_id: (req as any).id,
    };

    if (process.env.NODE_ENV !== 'production' && err.stack) {
      response.stack = err.stack;
    }

    if (err.details) {
      response.details = err.details;
    }

    res.status(statusCode).json(response);
  };
}

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(details: any) {
    super('Validation failed', 400, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}
