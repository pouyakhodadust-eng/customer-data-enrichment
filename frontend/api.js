/**
 * API Client for Customer Data Enrichment Engine
 */

const API_BASE_URL = window.API_BASE_URL || '/api/v1';

class ApiClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    setAuthToken(token) {
        this.authToken = token;
        if (token) {
            this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.defaultHeaders['Authorization'];
        }
    }

    async request(method, endpoint, data = null, customHeaders = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = { ...this.defaultHeaders, ...customHeaders };
        
        const options = {
            method,
            headers,
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }
            
            return result;
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            throw error;
        }
    }

    // Health Check
    async healthCheck() {
        return this.request('GET', '/health');
    }

    // Leads CRUD
    async getLeads(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/leads${queryString ? `?${queryString}` : ''}`;
        return this.request('GET', endpoint);
    }

    async getLead(id) {
        return this.request('GET', `/leads/${id}`);
    }

    async createLead(data) {
        return this.request('POST', '/leads', data);
    }

    async updateLead(id, data) {
        return this.request('PUT', `/leads/${id}`, data);
    }

    async deleteLead(id) {
        return this.request('DELETE', `/leads/${id}`);
    }

    async bulkDeleteLead(ids) {
        return this.request('POST', '/leads/bulk-delete', { ids });
    }

    async exportLeads(format = 'csv', filters = {}) {
        const params = { format, ...filters };
        const queryString = new URLSearchParams(params).toString();
        return this.request('GET', `/leads/export?${queryString}`);
    }

    // Enrichment
    async enrichLead(email, providers = ['clearbit', 'hunter', 'fullcontact']) {
        return this.request('POST', '/enrich', { email, providers });
    }

    async bulkEnrichLeads(emails, providers = ['clearbit', 'hunter', 'fullcontact']) {
        return this.request('POST', '/enrich/bulk', { emails, providers });
    }

    async getEnrichmentStatus(jobId) {
        return this.request('GET', `/enrich/status/${jobId}`);
    }

    // Scoring
    async getScoringRules() {
        return this.request('GET', '/scoring/rules');
    }

    async updateScoringRules(rules) {
        return this.request('PUT', '/scoring/rules', rules);
    }

    async scoreLead(leadId) {
        return this.request('POST', `/scoring/score/${leadId}`);
    }

    async bulkScoreLeads(leadIds) {
        return this.request('POST', '/scoring/bulk-score', { leadIds });
    }

    // Analytics
    async getDashboardMetrics() {
        return this.request('GET', '/analytics/dashboard');
    }

    async getLeadStats(period = '30d') {
        return this.request('GET', `/analytics/leads?period=${period}`);
    }

    async getEnrichmentStats(period = '30d') {
        return this.request('GET', `/analytics/enrichment?period=${period}`);
    }

    // Settings
    async getSettings() {
        return this.request('GET', '/settings');
    }

    async updateSettings(settings) {
        return this.request('PUT', '/settings', settings);
    }

    async getProviders() {
        return this.request('GET', '/settings/providers');
    }

    async updateProvider(provider, config) {
        return this.request('PUT', `/settings/providers/${provider}`, config);
    }
}

// Create global API instance
window.api = new ApiClient();
