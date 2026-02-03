import axios from 'axios';
import { query } from '../utils/database';
import { getRedis, setCache, getCache } from '../utils/redis';
import { loadConfig } from '../utils/config';

interface EnrichmentResult {
  success: boolean;
  provider: string;
  data?: any;
  error?: string;
  credits_used?: number;
}

interface EnrichmentProvider {
  name: string;
  enabled: boolean;
  api_key: string;
  rate_limit: number;
  timeout: number;
}

class EnrichmentService {
  private providers: Map<string, EnrichmentProvider> = new Map();
  private circuitBreakers: Map<string, any> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const config = loadConfig();
    
    // Clearbit
    if (config.enrichment.providers.clearbit?.enabled) {
      this.providers.set('clearbit', {
        name: 'clearbit',
        enabled: true,
        api_key: config.enrichment.providers.clearbit.api_key,
        rate_limit: config.enrichment.providers.clearbit.rate_limit,
        timeout: config.enrichment.providers.clearbit.timeout,
      });
    }

    // Hunter
    if (config.enrichment.providers.hunter?.enabled) {
      this.providers.set('hunter', {
        name: 'hunter',
        enabled: true,
        api_key: config.enrichment.providers.hunter.api_key,
        rate_limit: config.enrichment.providers.hunter.rate_limit,
        timeout: config.enrichment.providers.hunter.timeout,
      });
    }

    // FullContact
    if (config.enrichment.providers.fullcontact?.enabled) {
      this.providers.set('fullcontact', {
        name: 'fullcontact',
        enabled: true,
        api_key: config.enrichment.providers.fullcontact.api_key,
        rate_limit: config.enrichment.providers.fullcontact.rate_limit,
        timeout: config.enrichment.providers.fullcontact.timeout,
      });
    }
  }

  async enrichLead(lead: any, preferredProvider?: string): Promise<any> {
    const startTime = Date.now();
    const results: EnrichmentResult[] = [];
    let bestResult: any = null;

    // Try preferred provider first
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const result = await this.callProvider(preferredProvider, lead);
      results.push(result);
      if (result.success) {
        bestResult = result.data;
      }
    }

    // If no preferred provider or it failed, try all providers
    if (!bestResult) {
      for (const [name, provider] of this.providers) {
        if (name === preferredProvider) continue;
        
        const result = await this.callProvider(name, lead);
        results.push(result);

        if (result.success && (!bestResult || result.credits_used < (bestResult.credits_used || Infinity))) {
          bestResult = result.data;
        }
      }
    }

    // Log enrichment history
    await this.logEnrichmentHistory(lead.id, results, startTime);

    return {
      enriched: !!bestResult,
      provider: bestResult?.provider,
      data: bestResult,
      results,
    };
  }

  private async callProvider(providerName: string, lead: any): Promise<EnrichmentResult> {
    const provider = this.providers.get(providerName);
    if (!provider || !provider.enabled) {
      return { success: false, provider: providerName, error: 'Provider not enabled' };
    }

    const cacheKey = `enrichment:${providerName}:${lead.email}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return { success: true, provider: providerName, data: cached, credits_used: 0 };
    }

    try {
      let result;

      switch (providerName) {
        case 'clearbit':
          result = await this.enrichWithClearbit(provider, lead);
          break;
        case 'hunter':
          result = await this.enrichWithHunter(provider, lead);
          break;
        case 'fullcontact':
          result = await this.enrichWithFullContact(provider, lead);
          break;
        default:
          return { success: false, provider: providerName, error: 'Unknown provider' };
      }

      // Cache successful results for 24 hours
      if (result.success) {
        await setCache(cacheKey, result.data, 86400);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        provider: providerName,
        error: (error as Error).message,
      };
    }
  }

  private async enrichWithClearbit(provider: EnrichmentProvider, lead: any): Promise<EnrichmentResult> {
    try {
      const response = await axios.get(
        `https://person.clearbit.com/v2/combined/find?email=${lead.email}`,
        {
          headers: { Authorization: `Bearer ${provider.api_key}` },
          timeout: provider.timeout,
        }
      );

      if (response.data && response.data.person) {
        return {
          success: true,
          provider: 'clearbit',
          data: {
            person: {
              name: response.data.person.name,
              email: response.data.person.email,
              location: response.data.person.location,
              linkedin: response.data.person.linkedin,
              twitter: response.data.person.twitter,
              bio: response.data.person.bio,
            },
            company: response.data.company,
          },
          credits_used: 1,
        };
      }

      return { success: false, provider: 'clearbit', error: 'No data found' };
    } catch (error) {
      return {
        success: false,
        provider: 'clearbit',
        error: (error as Error).message,
      };
    }
  }

  private async enrichWithHunter(provider: EnrichmentProvider, lead: any): Promise<EnrichmentResult> {
    try {
      const response = await axios.get(
        `https://api.hunter.io/v2/email-verifier`,
        {
          params: { email: lead.email, api_key: provider.api_key },
          timeout: provider.timeout,
        }
      );

      const data = response.data.data;
      return {
        success: true,
        provider: 'hunter',
        data: {
          email: data.email,
          validity: data.result,
          score: data.score,
          regexp: data.regexp,
          gibberish: data.gibberish,
          disposable: data.disposable,
          webmail: data.webmail,
          mx_records: data.mx_records,
          smtp_server: data.smtp_server,
          smtp_check: data.smtp_check,
        },
        credits_used: 1,
      };
    } catch (error) {
      return {
        success: false,
        provider: 'hunter',
        error: (error as Error).message,
      };
    }
  }

  private async enrichWithFullContact(provider: EnrichmentProvider, lead: any): Promise<EnrichmentResult> {
    try {
      const response = await axios.post(
        'https://api.fullcontact.com/v3/person.enrich',
        { email: lead.email },
        {
          headers: { Authorization: `Bearer ${provider.api_key}` },
          timeout: provider.timeout,
        }
      );

      return {
        success: true,
        provider: 'fullcontact',
        data: {
          fullName: response.data.fullName,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          location: response.data.location,
          linkedin: response.data.socialProfiles?.find((p: any) => p.type === 'linkedin')?.value,
          twitter: response.data.socialProfiles?.find((p: any) => p.type === 'twitter')?.value,
          photos: response.data.photos,
          demographics: response.data.demographics,
        },
        credits_used: 1,
      };
    } catch (error) {
      return {
        success: false,
        provider: 'fullcontact',
        error: (error as Error).message,
      };
    }
  }

  async bulkEnrich(leadIds: string[], provider?: string): Promise<any[]> {
    const results = [];

    for (const leadId of leadIds) {
      try {
        const leadResult = await query(
          'SELECT * FROM leads WHERE id = $1 AND deleted_at IS NULL',
          [leadId]
        );

        if (leadResult.rows.length === 0) {
          results.push({ lead_id: leadId, error: 'Lead not found' });
          continue;
        }

        const enriched = await this.enrichLead(leadResult.rows[0], provider);
        results.push({ lead_id: leadId, enriched: enriched.enriched, data: enriched.data });
      } catch (error) {
        results.push({ lead_id: leadId, error: (error as Error).message });
      }

      // Rate limiting between requests
      await this.sleep(100);
    }

    return results;
  }

  private async logEnrichmentHistory(leadId: string, results: EnrichmentResult[], durationMs: number): Promise<void> {
    const successfulResult = results.find(r => r.success);

    await query(`
      INSERT INTO enrichment_history (
        lead_id, provider, enrichment_type, request_payload, response_data,
        status, error_message, credits_used, enrichment_duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      leadId,
      successfulResult?.provider || 'none',
      'person_enrichment',
      JSON.stringify(results.map(r => ({ provider: r.provider, attempted: true }))),
      JSON.stringify(successfulResult?.data || null),
      successfulResult ? 'completed' : 'failed',
      results.filter(r => r.error).map(r => r.error).join('; ') || null,
      results.reduce((sum, r) => sum + (r.credits_used || 0), 0),
      durationMs,
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const enrichmentService = new EnrichmentService();
