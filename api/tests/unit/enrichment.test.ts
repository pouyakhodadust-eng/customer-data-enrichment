// Enrichment Service Unit Tests
import { enrichmentService } from '../services/enrichment';

// Mock dependencies
jest.mock('../utils/database', () => ({
  query: jest.fn(),
}));

jest.mock('../utils/redis', () => ({
  getRedis: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
  })),
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

jest.mock('../utils/config', () => ({
  loadConfig: jest.fn(() => ({
    enrichment: {
      providers: {
        clearbit: { enabled: true, api_key: 'test-key', rate_limit: 100, timeout: 5000 },
        hunter: { enabled: true, api_key: 'test-key', rate_limit: 50, timeout: 5000 },
        fullcontact: { enabled: true, api_key: 'test-key', rate_limit: 30, timeout: 5000 },
      },
    },
  })),
}));

jest.mock('axios');

describe('EnrichmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichLead', () => {
    it('should return cached result if available', async () => {
      const { getCache } = require('../utils/redis');
      const cachedData = { email: 'test@example.com', name: 'Test User' };
      getCache.mockResolvedValue(cachedData);

      const lead = { id: '123', email: 'test@example.com' };
      const result = await enrichmentService.enrichLead(lead);

      expect(result.enriched).toBe(true);
      expect(result.data).toEqual(cachedData);
    });

    it('should fetch from provider when cache is empty', async () => {
      const { getCache } = require('../utils/redis');
      getCache.mockResolvedValue(null);

      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          person: {
            name: { fullName: 'John Smith' },
            email: 'john@company.com',
          },
        },
      });

      const lead = { id: '123', email: 'new@example.com' };
      const result = await enrichmentService.enrichLead(lead, 'clearbit');

      expect(result.enriched).toBe(true);
      expect(result.provider).toBe('clearbit');
    });

    it('should handle provider errors gracefully', async () => {
      const { getCache } = require('../utils/redis');
      getCache.mockResolvedValue(null);

      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('API error'));

      const lead = { id: '123', email: 'error@example.com' };
      const result = await enrichmentService.enrichLead(lead, 'clearbit');

      expect(result.enriched).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('bulkEnrich', () => {
    it('should process multiple leads', async () => {
      const { getCache } = require('../utils/redis');
      getCache.mockResolvedValue(null);

      const { query } = require('../utils/database');
      query
        .mockResolvedValueOnce({ rows: [{ id: '1', email: 'lead1@example.com' }] })
        .mockResolvedValueOnce({ rows: [{ id: '2', email: 'lead2@example.com' }] });

      const axios = require('axios');
      axios.get.mockResolvedValue({ data: {} });

      const result = await enrichmentService.bulkEnrich(['1', '2']);

      expect(result.length).toBe(2);
      expect(result[0].lead_id).toBe('1');
      expect(result[1].lead_id).toBe('2');
    });

    it('should handle non-existent leads', async () => {
      const { query } = require('../utils/database');
      query.mockResolvedValue({ rows: [] });

      const result = await enrichmentService.bulkEnrich(['nonexistent']);

      expect(result[0].error).toBe('Lead not found');
    });
  });
});
