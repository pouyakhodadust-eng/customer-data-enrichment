import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Lead created webhook
router.post('/lead/created', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lead } = req.body;

    if (!lead || !lead.email) {
      return res.status(400).json({ error: 'Invalid payload: email is required' });
    }

    // Insert new lead from webhook
    const result = await query(`
      INSERT INTO leads (
        email, first_name, last_name, company_name, job_title, phone, 
        source, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `, [
      lead.email,
      lead.first_name,
      lead.last_name,
      lead.company_name,
      lead.job_title,
      lead.phone,
      lead.source || 'webhook',
      JSON.stringify(lead.metadata || {}),
    ]);

    if (result.rows.length === 0) {
      return res.json({ message: 'Lead already exists', status: 'skipped' });
    }

    // Log webhook event
    await query(`
      INSERT INTO webhook_events (event_type, source, payload, status)
      VALUES ('lead.created', 'webhook', $1, 'completed')
    `, [JSON.stringify(req.body)]);

    res.status(201).json({ message: 'Lead created', lead: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Lead updated webhook
router.post('/lead/updated', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lead_id, updates } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'Invalid payload: lead_id is required' });
    }

    const result = await query(`
      UPDATE leads
      SET updated_at = NOW(),
          metadata = metadata || $1::jsonb
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [JSON.stringify(updates.metadata || {}), lead_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead updated', lead: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Engagement webhook
router.post('/engagement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lead_id, engagement_type, channel, subject, content, duration, occurred_at } = req.body;

    if (!lead_id || !engagement_type || !channel) {
      return res.status(400).json({ 
        error: 'Invalid payload: lead_id, engagement_type, and channel are required' 
      });
    }

    // Verify lead exists
    const leadCheck = await query(
      'SELECT id, email FROM leads WHERE id = $1 AND deleted_at IS NULL',
      [lead_id]
    );

    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Record engagement
    const engagementResult = await query(`
      INSERT INTO engagements (
        lead_id, engagement_type, channel, subject, content, 
        duration_seconds, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      lead_id,
      engagement_type,
      channel,
      subject,
      content,
      duration || 0,
      occurred_at || new Date().toISOString(),
    ]);

    // Update lead score based on engagement
    await query(`
      UPDATE lead_scores
      SET engagement_score = LEAST(100, engagement_score + $1),
          calculated_at = NOW()
      WHERE lead_id = $2
      AND calculated_at = (
        SELECT MAX(calculated_at) FROM lead_scores WHERE lead_id = $2
      )
    `, [calculateEngagementScore(engagement_type), lead_id]);

    // Log webhook event
    await query(`
      INSERT INTO webhook_events (event_type, source, payload, status)
      VALUES ('engagement.detected', 'webhook', $1, 'completed')
    `, [JSON.stringify(req.body)]);

    res.status(201).json({ 
      message: 'Engagement recorded',
      engagement: engagementResult.rows[0] 
    });
  } catch (error) {
    next(error);
  }
});

// Form submission webhook
router.post('/form/submitted', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { form_id, email, first_name, last_name, company_name, fields } = req.body;

    if (!email || !form_id) {
      return res.status(400).json({ 
        error: 'Invalid payload: email and form_id are required' 
      });
    }

    // Insert or update lead
    const result = await query(`
      INSERT INTO leads (
        email, first_name, last_name, company_name, source, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
        last_name = COALESCE(EXCLUDED.last_name, leads.last_name),
        company_name = COALESCE(EXCLUDED.company_name, leads.company_name),
        updated_at = NOW(),
        metadata = leads.metadata || EXCLUDED.metadata
      RETURNING *
    `, [
      email,
      first_name,
      last_name,
      company_name,
      `form:${form_id}`,
      JSON.stringify({ form_fields: fields, form_id }),
    ]);

    // Log webhook event
    await query(`
      INSERT INTO webhook_events (event_type, source, payload, status)
      VALUES ('form.submitted', 'webhook', $1, 'completed')
    `, [JSON.stringify(req.body)]);

    res.json({ message: 'Form submission processed', lead: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// n8n webhook for custom events
router.post('/custom/:eventType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventType } = req.params;
    const payload = req.body;

    // Store webhook event
    const result = await query(`
      INSERT INTO webhook_events (event_type, source, payload, status)
      VALUES ($1, 'n8n', $2, 'pending')
      RETURNING *
    `, [eventType, JSON.stringify(payload)]);

    // Process asynchronously (could trigger n8n workflow here)
    res.json({ 
      message: 'Webhook received',
      event_id: result.rows[0].id,
      event_type: eventType,
    });
  } catch (error) {
    next(error);
  }
});

// Batch webhook for bulk operations
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Invalid payload: events array is required' });
    }

    const results = [];

    for (const event of events) {
      try {
        const result = await query(`
          INSERT INTO webhook_events (event_type, source, payload, status)
          VALUES ($1, 'batch', $2, 'pending')
          RETURNING *
        `, [event.type, JSON.stringify(event.data)]);

        results.push({
          type: event.type,
          status: 'queued',
          event_id: result.rows[0].id,
        });
      } catch (err) {
        results.push({
          type: event.type,
          status: 'error',
          error: (err as Error).message,
        });
      }
    }

    res.json({
      message: 'Batch processed',
      processed: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

function calculateEngagementScore(engagementType: string): number {
  const scores: Record<string, number> = {
    'demo_completed': 15,
    'meeting_scheduled': 12,
    'whitepaper_download': 5,
    'email_opened': 2,
    'email_clicked': 5,
    'website_visit': 3,
    'pricing_viewed': 8,
    'trial_started': 20,
    'support_ticket': 3,
    'social_engagement': 2,
  };

  return scores[engagementType] || 1;
}

export { router as webhookRouter };
