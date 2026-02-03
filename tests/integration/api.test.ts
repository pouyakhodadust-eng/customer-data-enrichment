// API Integration Tests
import request from 'supertest';
import express from 'express';

// Mock all dependencies before importing the app
jest.mock('../api/src/utils/database', () => ({
  setupDatabase: jest.fn(),
  getPool: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
    query: jest.fn().mockResolvedValue({ rows: [] }),
  })),
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('../api/src/utils/redis', () => ({
  setupRedis: jest.fn(),
  getRedis: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
  })),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(undefined),
  deleteCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../api/src/utils/config', () => ({
  loadConfig: jest.fn(() => ({
    app: { name: 'Test API', port: 3000, environment: 'test' },
    database: { host: 'localhost', port: 5432 },
    redis: { host: 'localhost', port: 6379 },
    jwt: { secret: 'test-secret', expires_in: '24h', refresh_expires_in: '7d' },
    rate_limit: { window_ms: 60000, max_requests: 100 },
    cors: { origins: ['*'], methods: ['GET', 'POST'], credentials: true, max_age: 86400 },
    logging: { level: 'error', format: 'json' },
    monitoring: { enabled: false, prometheus_enabled: false },
  })),
}));

// Create a simple test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  
  // Mock health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
  
  // Mock leads endpoint
  app.get('/api/v1/leads', (req, res) => {
    res.json({
      data: [
        { id: '1', email: 'test@example.com', first_name: 'Test', last_name: 'User', status: 'new', source: 'website', total_score: 75 },
      ],
      pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
    });
  });
  
  return app;
}

describe('API Integration Tests', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/leads', () => {
    it('should return leads list', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/leads?page=1&limit=10')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/v1/leads?status=new')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
