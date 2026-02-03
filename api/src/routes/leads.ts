import { Router, Request, Response, NextFunction } from 'express';
import { query, transaction } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';
import { validationResult } from 'express-validator';
import { validateLead } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { enrichmentService } from '../services/enrichment';
import { scoringService } from '../services/scoring';
import { getCache, setCache, deleteCache, deleteCachePattern } from '../utils/redis';

const router = Router();

// Get all leads with pagination and filtering
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      min_score,
      max_score,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let whereConditions = ['deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`l.status = $${paramIndex++}`);
      params.push(status);
    }

    if (source) {
      whereConditions.push(`l.source = $${paramIndex++}`);
      params.push(source);
    }

    if (min_score) {
      whereConditions.push(`ls.total_score >= $${paramIndex++}`);
      params.push(parseFloat(min_score as string));
    }

    if (max_score) {
      whereConditions.push(`ls.total_score <= $${paramIndex++}`);
      params.push(parseFloat(max_score as string));
    }

    if (search) {
      whereConditions.push(`
        (l.email ILIKE $${paramIndex} OR 
         l.first_name ILIKE $${paramIndex} OR 
         l.last_name ILIKE $${paramIndex} OR 
         l.company_name ILIKE $${paramIndex})
      `);
      params.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const validSortColumns = ['created_at', 'updated_at', 'total_score', 'first_name', 'email'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'created_at';
    const sortDir = sort_order?.toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total
    const countQuery = `SELECT COUNT(*) FROM leads l LEFT JOIN lead_scores ls ON l.id = ls.lead_id ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch leads
    const selectQuery = `
      SELECT 
        l.*,
        ls.total_score,
        ls.demographic_score,
        ls.firmographic_score,
        ls.behavioral_score,
        ls.engagement_score,
        ls.ml_score,
        ls.score_breakdown,
        o.name as organization_name,
        o.industry,
        o.company_size
      FROM leads l
      LEFT JOIN lead_scores ls ON l.id = ls.lead_id AND ls.calculated_at = (
        SELECT MAX(calculated_at) FROM lead_scores WHERE lead_id = l.id
      )
      LEFT JOIN organizations o ON l.organization_id = o.id
      ${whereClause}
      ORDER BY l.${sortColumn} ${sortDir}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    params.push(limitNum, offset);
    const result = await query(selectQuery, params);

    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single lead
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cacheKey = `lead:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await query(`
      SELECT 
        l.*,
        ls.*,
        o.name as organization_name,
        o.industry,
        o.company_size,
        o.domain,
        o.data_quality_score as org_quality_score
      FROM leads l
      LEFT JOIN lead_scores ls ON l.id = ls.lead_id AND ls.calculated_at = (
        SELECT MAX(calculated_at) FROM lead_scores WHERE lead_id = l.id
      )
      LEFT JOIN organizations o ON l.organization_id = o.id
      WHERE l.id = $1 AND l.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = result.rows[0];

    // Cache for 5 minutes
    await setCache(cacheKey, lead, 300);

    res.json(lead);
  } catch (error) {
    next(error);
  }
});

// Create new lead
router.post('/', authenticate, validateLead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      first_name,
      last_name,
      company_name,
      job_title,
      phone,
      source,
      tags,
      metadata,
    } = req.body;

    const result = await transaction(async (client) => {
      // Insert lead
      const leadResult = await client.query(`
        INSERT INTO leads (
          email, first_name, last_name, company_name, job_title, phone, source, tags, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        email,
        first_name,
        last_name,
        company_name,
        job_title,
        phone,
        source,
        JSON.stringify(tags || []),
        JSON.stringify(metadata || {}),
      ]);

      const lead = leadResult.rows[0];

      // Initial scoring
      await scoringService.calculateAndSaveScore(lead.id);

      // Clear cache
      await deleteCachePattern('leads:list:*');

      return lead;
    });

    res.status(201).json(result);
  } catch (error) {
    if ((error as any).code === '23505') {
      return res.status(409).json({ error: 'Lead with this email already exists' });
    }
    next(error);
  }
});

// Update lead
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'first_name', 'last_name', 'company_name', 'job_title', 'phone',
      'source', 'status', 'tags', 'metadata', 'notes', 'assigned_to', 'owner_id',
    ];

    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = $${paramIndex++}`);
        params.push(key === 'tags' || key === 'metadata' ? JSON.stringify(value) : value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(`
      UPDATE leads
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Clear caches
    await deleteCache(`lead:${id}`);
    await deleteCachePattern('leads:list:*');

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Enrich lead
router.post('/:id/enrich', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { provider } = req.body;

    // Get lead
    const leadResult = await query('SELECT * FROM leads WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    // Perform enrichment
    const enrichedData = await enrichmentService.enrichLead(lead, provider);

    // Clear caches
    await deleteCache(`lead:${id}`);
    await deleteCachePattern('leads:list:*');

    res.json({
      message: 'Lead enriched successfully',
      enriched: enrichedData,
    });
  } catch (error) {
    next(error);
  }
});

// Delete lead (soft delete)
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE leads
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Clear caches
    await deleteCache(`lead:${id}`);
    await deleteCachePattern('leads:list:*');

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Bulk operations
router.post('/bulk/enrich', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lead_ids, provider } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids must be a non-empty array' });
    }

    const results = await enrichmentService.bulkEnrich(lead_ids, provider);

    // Clear all related caches
    await deleteCachePattern('leads:list:*');

    res.json({
      message: 'Bulk enrichment completed',
      processed: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

// Get lead statistics
router.get('/stats/overview', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'leads:stats:overview';
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_leads,
        COUNT(*) FILTER (WHERE status = 'new') as new_leads,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
        COUNT(*) FILTER (WHERE status IN ('won', 'qualified')) as converted_leads,
        AVG(ls.total_score) as avg_score,
        COUNT(*) FILTER (WHERE ls.total_score >= 80) as hot_leads,
        COUNT(*) FILTER (WHERE ls.total_score BETWEEN 50 AND 79) as warm_leads,
        COUNT(*) FILTER (WHERE ls.total_score < 50) as cold_leads,
        COUNT(DISTINCT source) as active_sources
      FROM leads l
      LEFT JOIN lead_scores ls ON l.id = ls.lead_id AND ls.calculated_at = (
        SELECT MAX(calculated_at) FROM lead_scores WHERE lead_id = l.id
      )
      WHERE l.deleted_at IS NULL
    `);

    const stats = result.rows[0];
    await setCache(cacheKey, stats, 60); // Cache for 1 minute

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export { router as leadsRouter };
