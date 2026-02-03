import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface Config {
  app: {
    name: string;
    host: string;
    port: number;
    environment: string;
    debug: boolean;
  };
  database: {
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    pool: { min: number; max: number };
    migrations: boolean;
  };
  redis: {
    host: string;
    port: number;
    password: string | null;
    db: number;
    key_prefix: string;
    cache: { ttl: number; max_size: number };
  };
  jwt: {
    secret: string;
    expires_in: string;
    refresh_expires_in: string;
  };
  enrichment: {
    providers: {
      [key: string]: {
        enabled: boolean;
        api_key: string;
        rate_limit: number;
        timeout: number;
      };
    };
  };
  scoring: {
    model_version: string;
    weights: {
      engagement: number;
      demographic: number;
      firmographic: number;
      behavioral: number;
    };
    thresholds: {
      hot: number;
      warm: number;
      cold: number;
    };
  };
  rate_limit: {
    window_ms: number;
    max_requests: number;
    skip_failed_requests: boolean;
  };
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    credentials: boolean;
    max_age: number;
  };
  logging: {
    level: string;
    format: string;
    include_timestamp: boolean;
    include_request_id: boolean;
  };
  monitoring: {
    enabled: boolean;
    metrics_endpoint: string;
    health_endpoint: string;
    prometheus_enabled: boolean;
  };
  webhooks: {
    max_payload_size: string;
    signature_header: string;
    timestamp_header: string;
    timestamp_tolerance_ms: number;
  };
  security: {
    encryption_algorithm: string;
    password_min_length: number;
    max_login_attempts: number;
    lockout_duration_minutes: number;
  };
  session: {
    cookie_name: string;
    cookie_secure: boolean;
    cookie_http_only: boolean;
    cookie_same_site: string;
  };
  queue: {
    redis_url: string;
    prefix: string;
    jobs: {
      enrichment: {
        attempts: number;
        backoff: { type: string; delay: number };
      };
      scoring: {
        attempts: number;
        backoff: { type: string; delay: number };
      };
    };
  };
  features: {
    ai_scoring: boolean;
    batch_enrichment: boolean;
    webhook_sync: boolean;
    export_enabled: boolean;
    dark_mode: boolean;
  };
}

let cachedConfig: Config | null = null;

export function loadConfig(configPath?: string): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const defaultPath = path.join(__dirname, '../../config/api.config.yaml');
  const filePath = configPath || process.env.CONFIG_PATH || defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const config = yaml.parse(fileContent) as Config;

  // Environment variable overrides
  config.app.environment = process.env.NODE_ENV || config.app.environment;
  config.app.port = parseInt(process.env.API_PORT || String(config.app.port), 10);
  
  config.database.host = process.env.POSTGRES_HOST || config.database.host;
  config.database.port = parseInt(process.env.POSTGRES_PORT || String(config.database.port), 10);
  config.database.username = process.env.POSTGRES_USER || config.database.username;
  config.database.password = process.env.POSTGRES_PASSWORD || config.database.password;
  config.database.name = process.env.POSTGRES_DB || config.database.name;
  
  config.redis.host = process.env.REDIS_HOST || config.redis.host;
  config.redis.port = parseInt(process.env.REDIS_PORT || String(config.redis.port), 10);
  
  config.jwt.secret = process.env.JWT_SECRET || config.jwt.secret;
  
  // Enrichment API keys
  if (process.env.CLEARBIT_KEY) {
    config.enrichment.providers.clearbit.api_key = process.env.CLEARBIT_KEY;
  }
  if (process.env.HUNTER_KEY) {
    config.enrichment.providers.hunter.api_key = process.env.HUNTER_KEY;
  }
  if (process.env.FULLCONTACT_KEY) {
    config.enrichment.providers.fullcontact.api_key = process.env.FULLCONTACT_KEY;
  }

  cachedConfig = config;
  return config;
}

export function getConfig(): Config {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
