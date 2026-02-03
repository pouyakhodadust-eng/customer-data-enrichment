import winston from 'winston';

export interface LoggerOptions {
  level: string;
  format: string;
  include_timestamp: boolean;
  include_request_id: boolean;
}

const jsonFormatter = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const simpleFormatter = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, request_id, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (request_id) {
      msg = `[${request_id}] ${msg}`;
    }
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

export function createLogger(options: LoggerOptions): winston.Logger {
  const formatters = options.format === 'json' ? jsonFormatter : simpleFormatter;

  return winston.createLogger({
    level: options.level,
    format: formatters,
    defaultMeta: { service: 'enrichment-api' },
    transports: [
      new winston.transports.Console(),
    ],
  });
}

// Metrics client for Prometheus
let metricsClient: any = null;

export function setupMetrics(app: any, config: any): void {
  if (!config.monitoring.enabled || !config.monitoring.prometheus_enabled) {
    return;
  }

  // Dynamic import to avoid loading when not needed
  import('prom-client').then((PromClient) => {
    const client = PromClient;
    
    // Create a Registry
    const register = new client.Registry();
    
    // Add default metrics
    client.collectDefaultMetrics({ register });
    
    // Custom metrics
    const httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register],
    });
    
    const httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });
    
    const leadsEnriched = new client.Counter({
      name: 'leads_enriched_total',
      help: 'Total number of leads enriched',
      labelNames: ['provider', 'status'],
      registers: [register],
    });
    
    const leadScoreUpdate = new client.Counter({
      name: 'lead_score_updates_total',
      help: 'Total number of lead score updates',
      labelNames: ['model_version'],
      registers: [register],
    });
    
    const enrichmentDuration = new client.Histogram({
      name: 'enrichment_duration_seconds',
      help: 'Duration of enrichment operations',
      labelNames: ['provider'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [register],
    });
    
    // Store metrics client for use in routes
    app.locals.metrics = {
      register,
      httpRequestDuration,
      httpRequestTotal,
      leadsEnriched,
      leadScoreUpdate,
      enrichmentDuration,
    };
    
    // Metrics endpoint
    app.get(config.monitoring.metrics_endpoint, async (req: any, res: any) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).end();
      }
    });
    
    metricsClient = app.locals.metrics;
  });
}

export function getMetrics() {
  return metricsClient;
}
