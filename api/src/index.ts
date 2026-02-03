import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { loadConfig } from './utils/config';
import { createLogger } from './utils/logger';
import { setupDatabase } from './utils/database';
import { setupRedis } from './utils/redis';
import { setupMetrics } from './utils/metrics';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rate-limit';

// Routes
import { healthRouter } from './routes/health';
import { leadsRouter } from './routes/leads';
import { webhookRouter } from './routes/webhook';
import { authRouter } from './routes/auth';

const config = loadConfig();
const logger = createLogger(config.logging);

async function bootstrap(): Promise<Application> {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.cors.origins,
    methods: config.cors.methods,
    credentials: config.cors.credentials,
    maxAge: config.cors.max_age,
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Request ID
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Rate limiting
  app.use(rateLimiter(config.rate_limit));

  // Request logging
  app.use(requestLogger(logger));

  // Metrics setup
  setupMetrics(app, config);

  // Health check routes
  app.use('/health', healthRouter);

  // API routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/leads', leadsRouter);
  app.use('/webhooks', webhookRouter);

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: config.app.name,
      version: '1.0.0',
      environment: config.app.environment,
      status: 'running',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      request_id: req.id,
    });
  });

  // Error handling
  app.use(errorHandler(logger));

  return app;
}

async function startServer(): Promise<void> {
  try {
    // Initialize database
    logger.info('Connecting to PostgreSQL...');
    await setupDatabase(config.database);
    logger.info('PostgreSQL connected successfully');

    // Initialize Redis
    logger.info('Connecting to Redis...');
    await setupRedis(config.redis);
    logger.info('Redis connected successfully');

    // Create and start server
    const app = await bootstrap();
    const port = config.app.port;
    const host = config.app.host;

    app.listen(port, host, () => {
      logger.info(`🚀 Server running at http://${host}:${port}`);
      logger.info(`📊 Health check: http://${host}:${port}/health`);
      logger.info(`🔗 API base: http://${host}:${port}/api/v1`);
      logger.info(`🌐 Environment: ${config.app.environment}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { bootstrap };
