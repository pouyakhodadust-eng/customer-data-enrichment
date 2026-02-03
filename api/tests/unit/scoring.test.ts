// Scoring Service Unit Tests
import { scoringService } from '../services/scoring';

// Mock dependencies
jest.mock('../utils/database', () => ({
  query: jest.fn(),
}));

jest.mock('../utils/config', () => ({
  loadConfig: jest.fn(() => ({
    scoring: {
      model_version: '1.0.0',
      weights: {
        engagement: 0.35,
        demographic: 0.25,
        firmographic: 0.25,
        behavioral: 0.15,
      },
      thresholds: { hot: 80, warm: 50, cold: 0 },
    },
  })),
}));

describe('ScoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAndSaveScore', () => {
    it('should calculate score for a new lead', async () => {
      const { query } = require('../utils/database');
      
      query
        .mockResolvedValueOnce({
          rows: [{
            id: '123',
            email: 'test@example.com',
            job_title: 'CTO',
            seniority_level: 'c-level',
            company_size: '100-500',
            industry: 'Technology',
            data_quality_score: 0.85,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await scoringService.calculateAndSaveScore('123');

      expect(result).toHaveProperty('total_score');
      expect(result).toHaveProperty('demographic_score');
      expect(result).toHaveProperty('firmographic_score');
      expect(result).toHaveProperty('breakdown');
      expect(result.total_score).toBeGreaterThanOrEqual(0);
      expect(result.total_score).toBeLessThanOrEqual(100);
    });

    it('should throw error for non-existent lead', async () => {
      const { query } = require('../utils/database');
      query.mockResolvedValue({ rows: [] });

      await expect(scoringService.calculateAndSaveScore('nonexistent'))
        .rejects.toThrow('Lead not found');
    });

    it('should correctly calculate title weight for executives', async () => {
      const { query } = require('../utils/database');
      
      query
        .mockResolvedValueOnce({
          rows: [{
            id: '123',
            email: 'exec@example.com',
            job_title: 'Chief Technology Officer',
            seniority_level: 'c-level',
            company_size: '1000-5000',
            industry: 'Finance',
            annual_revenue: 150000000,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await scoringService.calculateAndSaveScore('123');

      expect(result.demographic_score).toBeGreaterThan(50);
      expect(result.firmographic_score).toBeGreaterThan(50);
    });
  });

  describe('getScoreCategory', () => {
    it('should return hot for scores >= 80', () => {
      expect(scoringService.getScoreCategory(80)).toBe('hot');
      expect(scoringService.getScoreCategory(95)).toBe('hot');
      expect(scoringService.getScoreCategory(100)).toBe('hot');
    });

    it('should return warm for scores between 50-79', () => {
      expect(scoringService.getScoreCategory(50)).toBe('warm');
      expect(scoringService.getScoreCategory(65)).toBe('warm');
      expect(scoringService.getScoreCategory(79)).toBe('warm');
    });

    it('should return cold for scores < 50', () => {
      expect(scoringService.getScoreCategory(0)).toBe('cold');
      expect(scoringService.getScoreCategory(25)).toBe('cold');
      expect(scoringService.getScoreCategory(49)).toBe('cold');
    });
  });

  describe('bulkRescore', () => {
    it('should rescore multiple leads', async () => {
      const { query } = require('../utils/database');
      
      query
        .mockResolvedValueOnce({
          rows: [{ id: '1', email: 'lead1@example.com', job_title: 'Manager' }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: '2', email: 'lead2@example.com', job_title: 'Director' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await scoringService.bulkRescore(['1', '2']);

      expect(result.length).toBe(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const { query } = require('../utils/database');
      query.mockResolvedValue({ rows: [] });

      const result = await scoringService.bulkRescore(['nonexistent']);

      expect(result.length).toBe(1);
      expect(result[0].success).toBe(false);
      expect(result[0].error).toBeDefined();
    });
  });
});
