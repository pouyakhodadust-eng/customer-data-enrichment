import { query } from '../utils/database';
import { loadConfig } from '../utils/config';

interface ScoreBreakdown {
  company_size_bonus?: number;
  title_weight?: number;
  engagement_level?: number;
  industry_match?: number;
  budget_indicator?: number;
  growth_stage?: number;
  product_fit?: number;
  enterprise_ready?: number;
  decision_maker?: number;
  startup_risk?: number;
  limited_data?: number;
  [key: string]: number | undefined;
}

interface LeadScore {
  total_score: number;
  demographic_score: number;
  firmographic_score: number;
  behavioral_score: number;
  engagement_score: number;
  ml_score: number;
  breakdown: ScoreBreakdown;
}

class ScoringService {
  private weights: {
    engagement: number;
    demographic: number;
    firmographic: number;
    behavioral: number;
  };
  private thresholds: { hot: number; warm: number; cold: number };

  constructor() {
    const config = loadConfig();
    this.weights = config.scoring.weights;
    this.thresholds = config.scoring.thresholds;
  }

  async calculateAndSaveScore(leadId: string): Promise<LeadScore> {
    // Get lead with related data
    const leadResult = await query(`
      SELECT 
        l.*,
        o.name as org_name,
        o.industry,
        o.company_size,
        o.annual_revenue,
        o.data_quality_score as org_quality,
        c.job_title,
        c.seniority_level,
        c.department,
        c.email_validated,
        ls.engagement_score as current_engagement_score
      FROM leads l
      LEFT JOIN organizations o ON l.organization_id = o.id
      LEFT JOIN contacts c ON l.contact_id = c.id
      LEFT JOIN lead_scores ls ON l.id = ls.lead_id AND ls.calculated_at = (
        SELECT MAX(calculated_at) FROM lead_scores WHERE lead_id = l.id
      )
      WHERE l.id = $1
    `, [leadId]);

    if (leadResult.rows.length === 0) {
      throw new Error('Lead not found');
    }

    const lead = leadResult.rows[0];
    const breakdown: ScoreBreakdown = {};

    // Calculate demographic score (0-100)
    const demographicScore = this.calculateDemographicScore(lead, breakdown);
    
    // Calculate firmographic score (0-100)
    const firmographicScore = this.calculateFirmographicScore(lead, breakdown);
    
    // Calculate behavioral score (0-100)
    const behavioralScore = this.calculateBehavioralScore(lead, breakdown);
    
    // Calculate engagement score (0-100)
    const engagementScore = this.calculateEngagementScore(lead, breakdown);
    
    // Calculate ML score (simulated - in production, this would call an ML model)
    const mlScore = this.calculateMLScore(lead, demographicScore, firmographicScore, behavioralScore, engagementScore);

    // Calculate weighted total score
    const totalScore = Math.round(
      (demographicScore * this.weights.demographic +
       firmographicScore * this.weights.firmographic +
       behavioralScore * this.weights.behavioral +
       engagementScore * this.weights.engagement +
       mlScore * 0.1) * 100
    ) / 100;

    // Save score
    await query(`
      INSERT INTO lead_scores (
        lead_id, contact_id, organization_id, total_score,
        demographic_score, firmographic_score, behavioral_score,
        engagement_score, ml_score, scoring_model, model_version,
        feature_weights, score_breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      leadId,
      lead.contact_id,
      lead.organization_id,
      totalScore,
      demographicScore,
      firmographicScore,
      behavioralScore,
      engagementScore,
      mlScore,
      'ml_ensemble',
      loadConfig().scoring.model_version,
      JSON.stringify(this.weights),
      JSON.stringify(breakdown),
    ]);

    return {
      total_score: totalScore,
      demographic_score: demographicScore,
      firmographic_score: firmographicScore,
      behavioral_score: behavioralScore,
      engagement_score: engagementScore,
      ml_score: mlScore,
      breakdown,
    };
  }

  private calculateDemographicScore(lead: any, breakdown: ScoreBreakdown): number {
    let score = 50; // Base score
    const titleWeight = this.calculateTitleWeight(lead.job_title, lead.seniority_level);
    breakdown.title_weight = titleWeight;
    score += titleWeight;

    // Email validation bonus
    if (lead.email_validated) {
      score += 10;
      breakdown.email_validated = 10;
    }

    // Department relevance (sales, marketing, tech get higher scores)
    const relevantDepts = ['technology', 'engineering', 'product', 'sales', 'marketing'];
    if (relevantDepts.includes((lead.department || '').toLowerCase())) {
      score += 10;
      breakdown.department_bonus = 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateTitleWeight(title: string, seniority: string): number {
    if (!title && !seniority) return 0;

    const seniorityScores: Record<string, number> = {
      'c-level': 30,
      'vp': 25,
      'director': 20,
      'manager': 15,
      'senior': 10,
      'mid': 5,
      'junior': 0,
    };

    let score = 0;
    
    if (seniority) {
      const seniorityLower = seniority.toLowerCase();
      score += seniorityScores[seniorityLower] || 10;
    }

    // Title keywords
    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('cto') || titleLower.includes('chief')) score += 15;
    else if (titleLower.includes('vp') || titleLower.includes('vice president')) score += 12;
    else if (titleLower.includes('director') || titleLower.includes('head')) score += 10;
    else if (titleLower.includes('manager')) score += 5;

    return Math.min(30, score);
  }

  private calculateFirmographicScore(lead: any, breakdown: ScoreBreakdown): number {
    let score = 40; // Base score

    // Company size scoring
    const sizeScores: Record<string, number> = {
      '1000-5000': 20,
      '500-1000': 18,
      '100-500': 15,
      '50-100': 12,
      '10-50': 10,
      '1-10': 5,
    };

    const sizeBonus = sizeScores[lead.company_size] || 0;
    breakdown.company_size_bonus = sizeBonus;
    score += sizeBonus;

    // Industry match bonus
    const targetIndustries = ['technology', 'finance', 'healthcare', 'education'];
    if (targetIndustries.includes((lead.industry || '').toLowerCase())) {
      score += 15;
      breakdown.industry_match = 15;
    }

    // Revenue indicator
    if (lead.annual_revenue) {
      const revenue = parseFloat(lead.annual_revenue);
      if (revenue > 100000000) {
        score += 15;
        breakdown.revenue_tier = 15;
      } else if (revenue > 50000000) {
        score += 10;
        breakdown.revenue_tier = 10;
      } else if (revenue > 10000000) {
        score += 5;
        breakdown.revenue_tier = 5;
      }
    }

    // Data quality bonus
    if (lead.org_quality) {
      const qualityBonus = Math.round(parseFloat(lead.org_quality) * 10);
      score += qualityBonus;
      breakdown.data_quality = qualityBonus;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateBehavioralScore(lead: any, breakdown: ScoreBreakdown): number {
    let score = 50; // Base score

    // Number of previous engagements
    // This would query the engagements table in a real implementation
    const engagementCount = lead.current_engagement_score ? 5 : 0; // Placeholder
    
    if (engagementCount > 10) {
      score += 25;
      breakdown.high_engagement = 25;
    } else if (engagementCount > 5) {
      score += 15;
      breakdown.moderate_engagement = 15;
    } else if (engagementCount > 0) {
      score += 10;
      breakdown.some_engagement = 10;
    }

    // Recent activity bonus
    // Would check engagement timestamps in real implementation
    breakdown.behavioral_base = 50;

    return Math.min(100, Math.max(0, score));
  }

  private calculateEngagementScore(lead: any, breakdown: ScoreBreakdown): number {
    let score = 0;

    // Get recent engagement count
    // This would be a real query in production
    const recentEngagements = 0; // Placeholder

    // Engagement type weights
    const engagementWeights: Record<string, number> = {
      'demo_completed': 30,
      'meeting_scheduled': 25,
      'trial_started': 25,
      'whitepaper_download': 10,
      'pricing_viewed': 15,
      'email_opened': 5,
      'email_clicked': 8,
      'website_visit': 3,
    };

    // In production, this would query actual engagement data
    score = 30; // Base engagement from lead creation

    breakdown.engagement_level = 30;
    breakdown.engagement_base = true;

    return Math.min(100, Math.max(0, score));
  }

  private calculateMLScore(
    lead: any,
    demographic: number,
    firmographic: number,
    behavioral: number,
    engagement: number
  ): number {
    // In production, this would call an ML model API
    // For now, we simulate an ML prediction based on feature combinations
    
    // Feature vector
    const features = {
      demographic_score: demographic / 100,
      firmographic_score: firmographic / 100,
      behavioral_score: behavioral / 100,
      engagement_score: engagement / 100,
    };

    // Simple heuristic-based "ML" prediction
    let prediction = 0.5; // Neutral baseline

    // Add feature influences
    if (features.demographic_score > 0.7) prediction += 0.1;
    if (features.firmographic_score > 0.7) prediction += 0.15;
    if (features.behavioral_score > 0.7) prediction += 0.1;
    if (features.engagement_score > 0.7) prediction += 0.15;

    // Subtract for negative signals
    if (features.demographic_score < 0.3) prediction -= 0.1;
    if (features.firmographic_score < 0.3) prediction -= 0.1;

    // Convert to 0-100 scale
    return Math.round(Math.max(0, Math.min(100, prediction * 100)));
  }

  getScoreCategory(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= this.thresholds.hot) return 'hot';
    if (score >= this.thresholds.warm) return 'warm';
    return 'cold';
  }

  async getLeadScoreHistory(leadId: string): Promise<any[]> {
    const result = await query(`
      SELECT *
      FROM lead_scores
      WHERE lead_id = $1
      ORDER BY calculated_at DESC
    `, [leadId]);

    return result.rows;
  }

  async bulkRescore(leadIds: string[]): Promise<any[]> {
    const results = [];

    for (const leadId of leadIds) {
      try {
        const score = await this.calculateAndSaveScore(leadId);
        results.push({ lead_id: leadId, score: score.total_score, success: true });
      } catch (error) {
        results.push({ lead_id: leadId, error: (error as Error).message, success: false });
      }
    }

    return results;
  }
}

export const scoringService = new ScoringService();
