// Logger utility
import winston from 'winston';

export interface LoggerConfig {
  level: string;
  format: 'json' | 'simple';
  outputs: string[];
}

export function createLogger(config: LoggerConfig): winston.Logger {
  const formats = [
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
  ];

  if (config.format === 'json') {
    formats.push(winston.format.json());
  } else {
    formats.push(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    );
  }

  const transports: winston.transport[] = [];

  if (config.outputs.includes('console')) {
    transports.push(new winston.transports.Console());
  }

  return winston.createLogger({
    level: config.level,
    format: winston.format.combine(...formats),
    transports,
    defaultMeta: { service: 'enrichment-engine' },
  });
}
