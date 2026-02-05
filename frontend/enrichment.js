/**
 * Enrichment Module - Customer Data Enrichment Engine
 */

const Enrichment = {
    currentStep: 1,
    selectedLeads: [],
    selectedProviders: [],
    enrichmentJob: null,
    results: [],

    init() {
        this.setupEventListeners();
    },

    openModal(leadIds = []) {
        const modal = document.getElementById('enrichment-modal');
        if (!modal) return;

        this.selectedLeads = leadIds;
        this.currentStep = 1;
        this.selectedProviders = [];
        this.results = [];

        // Reset UI
        this.resetModal();

        // Show selected leads or all leads if none selected
        if (this.selectedLeads.length > 0) {
            this.displaySelectedLeads();
        } else {
            this.displayAllLeads();
        }

        modal.classList.add('active');
    },

    closeModal() {
        const modal = document.getElementById('enrichment-modal');
        modal.classList.remove('active');
        this.resetModal();
    },

    resetModal() {
        document.getElementById('step-selection').style.display = 'block';
        document.getElementById('step-providers').style.display = 'none';
        document.getElementById('step-progress').style.display = 'none';
        document.getElementById('step-results').style.display = 'none';
        document.getElementById('enrichment-back').style.display = 'none';
        document.getElementById('enrichment-next').style.display = 'inline-flex';
        document.getElementById('enrichment-next').textContent = 'Next';
        document.getElementById('start-enrichment').style.display = 'none';
        document.getElementById('download-results').style.display = 'none';
        document.getElementById('enrichment-progress').style.width = '0%';
        document.getElementById('progress-text').textContent = '0 of 0 leads enriched';
        document.getElementById('enrichment-log').innerHTML = '';
        document.getElementById('selected-leads-list').innerHTML = '';
        document.querySelectorAll('.provider-card').forEach(card => {
            card.classList.remove('selected', 'configured');
        });
    },

    displaySelectedLeads() {
        const container = document.getElementById('selected-leads-list');
        const leads = this.selectedLeads.map(id => Leads.leads.find(l => l.id === id)).filter(Boolean);
        
        container.innerHTML = leads.map(lead => `
            <div class="enrichment-lead-item" data-id="${lead.id}">
                <label class="checkbox">
                    <input type="checkbox" checked data-id="${lead.id}">
                </label>
                <div class="lead-info">
                    <div class="lead-avatar">${this.getInitials(lead)}</div>
                    <div class="lead-details">
                        <span class="lead-name">${this.formatName(lead)}</span>
                        <span class="lead-email">${lead.email}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    displayAllLeads() {
        const container = document.getElementById('selected-leads-list');
        container.innerHTML = Leads.leads.map(lead => `
            <div class="enrichment-lead-item" data-id="${lead.id}">
                <label class="checkbox">
                    <input type="checkbox" checked data-id="${lead.id}">
                </label>
                <div class="lead-info">
                    <div class="lead-avatar">${this.getInitials(lead)}</div>
                    <div class="lead-details">
                        <span class="lead-name">${this.formatName(lead)}</span>
                        <span class="lead-email">${lead.email}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    setupEventListeners() {
        // Provider cards
        document.querySelectorAll('.provider-card').forEach(card => {
            card.addEventListener('click', () => {
                const provider = card.dataset.provider;
                if (card.classList.contains('configured')) {
                    card.classList.toggle('selected');
                    if (card.classList.contains('selected')) {
                        this.selectedProviders.push(provider);
                    } else {
                        this.selectedProviders = this.selectedProviders.filter(p => p !== provider);
                    }
                } else {
                    this.showToast(`Please configure ${provider} API key in Settings`, 'warning');
                }
            });
        });

        // Navigation buttons
        document.getElementById('enrichment-next')?.addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('enrichment-back')?.addEventListener('click', () => {
            this.prevStep();
        });

        document.getElementById('start-enrichment')?.addEventListener('click', () => {
            this.startEnrichment();
        });

        document.getElementById('download-results')?.addEventListener('click', () => {
            this.downloadResults();
        });

        // Modal close
        document.querySelectorAll('#enrichment-modal .close-btn, #enrichment-modal .close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        document.querySelector('#enrichment-modal .modal-overlay')?.addEventListener('click', () => {
            this.closeModal();
        });
    },

    nextStep() {
        if (this.currentStep === 1) {
            // Collect selected leads from checkboxes
            const checkedBoxes = document.querySelectorAll('#selected-leads-list input:checked');
            this.selectedLeads = Array.from(checkedBoxes).map(cb => parseInt(cb.dataset.id));
            
            if (this.selectedLeads.length === 0) {
                this.showToast('Please select at least one lead', 'warning');
                return;
            }

            this.currentStep = 2;
        } else if (this.currentStep === 2) {
            if (this.selectedProviders.length === 0) {
                this.showToast('Please select at least one provider', 'warning');
                return;
            }

            this.currentStep = 3;
            this.startEnrichment();
            return;
        }

        this.updateStepUI();
    },

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepUI();
        }
    },

    updateStepUI() {
        // Hide all steps
        document.getElementById('step-selection').style.display = 'none';
        document.getElementById('step-providers').style.display = 'none';
        document.getElementById('step-progress').style.display = 'none';
        document.getElementById('step-results').style.display = 'none';

        // Update navigation buttons
        const backBtn = document.getElementById('enrichment-back');
        const nextBtn = document.getElementById('enrichment-next');

        if (this.currentStep === 1) {
            document.getElementById('step-selection').style.display = 'block';
            backBtn.style.display = 'none';
            nextBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Next';
        } else if (this.currentStep === 2) {
            document.getElementById('step-providers').style.display = 'block';
            backBtn.style.display = 'inline-flex';
            nextBtn.style.display = 'inline-flex';
            nextBtn.textContent = 'Start Enrichment';
        } else if (this.currentStep === 3) {
            document.getElementById('step-progress').style.display = 'block';
            backBtn.style.display = 'inline-flex';
            nextBtn.style.display = 'none';
        } else if (this.currentStep === 4) {
            document.getElementById('step-results').style.display = 'block';
            backBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            document.getElementById('download-results').style.display = 'inline-flex';
        }
    },

    async startEnrichment() {
        const leads = this.selectedLeads.map(id => Leads.leads.find(l => l.id === id)).filter(Boolean);
        const total = leads.length;
        let completed = 0;
        let success = 0;
        let failed = 0;

        document.getElementById('start-enrichment').style.display = 'none';
        document.getElementById('enrichment-back').style.display = 'none';

        for (const lead of leads) {
            try {
                this.addLog(`Enriching ${lead.email}...`, 'info');
                
                // Simulate API call (replace with real API in production)
                await this.simulateEnrichment(lead);
                
                this.results.push({
                    lead,
                    success: true,
                    data: this.generateEnrichmentData(lead)
                });
                
                success++;
                this.addLog(`✓ ${lead.email} enriched successfully`, 'success');
            } catch (error) {
                failed++;
                this.results.push({
                    lead,
                    success: false,
                    error: error.message
                });
                this.addLog(`✕ ${lead.email} failed: ${error.message}`, 'error');
            }

            completed++;
            this.updateProgress(completed, total);
        }

        this.currentStep = 4;
        this.updateStepUI();
        this.displayResults();
        this.showToast(`Enrichment complete! ${success} success, ${failed} failed`, success > 0 ? 'success' : 'error');
    },

    async simulateEnrichment(lead) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Randomly succeed or fail
        if (Math.random() > 0.1) {
            return { success: true };
        } else {
            throw new Error('Provider rate limit exceeded');
        }
    },

    generateEnrichmentData(lead) {
        return {
            company: {
                name: lead.company_name || 'Unknown Company',
                domain: lead.email.split('@')[1]?.split('.')[0] || 'unknown',
                industry: ['Technology', 'Finance', 'Healthcare', 'E-commerce', 'Manufacturing'][Math.floor(Math.random() * 5)],
                employees: Math.floor(Math.random() * 10000) + 10,
                revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`,
                location: ['San Francisco', 'New York', 'London', 'Berlin', 'Tokyo'][Math.floor(Math.random() * 5)]
            },
            social: {
                linkedin: lead.linkedin_url || `https://linkedin.com/in/${lead.email.split('@')[0]}`,
                twitter: `@${lead.email.split('@')[0]}`
            },
            engagement: {
                last_visit: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                page_views: Math.floor(Math.random() * 100),
                email_opens: Math.floor(Math.random() * 50),
                email_clicks: Math.floor(Math.random() * 20)
            }
        };
    },

    updateProgress(completed, total) {
        const percent = (completed / total) * 100;
        document.getElementById('enrichment-progress').style.width = `${percent}%`;
        document.getElementById('progress-text').textContent = `${completed} of ${total} leads enriched`;
    },

    addLog(message, type = 'info') {
        const log = document.getElementById('enrichment-log');
        const item = document.createElement('div');
        item.className = `log-item ${type}`;
        item.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        log.appendChild(item);
        log.scrollTop = log.scrollHeight;
    },

    displayResults() {
        const summary = document.getElementById('results-summary');
        const data = document.getElementById('enriched-data');
        
        const successCount = this.results.filter(r => r.success).length;
        const failedCount = this.results.filter(r => !r.success).length;
        
        summary.innerHTML = `
            <div class="results-stats" style="display: flex; gap: 24px; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${successCount}</div>
                    <div style="color: var(--text-muted);">Successful</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--danger);">${failedCount}</div>
                    <div style="color: var(--text-muted);">Failed</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">${successCount + failedCount}</div>
                    <div style="color: var(--text-muted);">Total</div>
                </div>
            </div>
        `;

        data.innerHTML = this.results.map(result => `
            <div class="enrichment-result-item" style="padding: 16px; border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="${result.success ? 'status-badge enriched' : 'status-badge failed'}">${result.success ? '✓ Enriched' : '✕ Failed'}</span>
                        <span style="font-weight: 500;">${result.lead.email}</span>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="Enrichment.toggleResultDetails(${this.results.indexOf(result)})">View Details</button>
                </div>
                <div class="result-details" id="result-${this.results.indexOf(result)}" style="display: none; padding-top: 12px; border-top: 1px solid var(--border-color);">
                    ${result.success ? this.formatEnrichmentData(result.data) : `<p style="color: var(--danger);">Error: ${result.error}</p>`}
                </div>
            </div>
        `).join('');
    },

    formatEnrichmentData(data) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div>
                    <h4 style="font-weight: 600; margin-bottom: 8px;">🏢 Company</h4>
                    <p style="margin: 4px 0;"><strong>Name:</strong> ${data.company.name}</p>
                    <p style="margin: 4px 0;"><strong>Domain:</strong> ${data.company.domain}</p>
                    <p style="margin: 4px 0;"><strong>Industry:</strong> ${data.company.industry}</p>
                    <p style="margin: 4px 0;"><strong>Employees:</strong> ${data.company.employees}</p>
                    <p style="margin: 4px 0;"><strong>Revenue:</strong> ${data.company.revenue}</p>
                    <p style="margin: 4px 0;"><strong>Location:</strong> ${data.company.location}</p>
                </div>
                <div>
                    <h4 style="font-weight: 600; margin-bottom: 8px;">🔗 Social</h4>
                    <p style="margin: 4px 0;"><strong>LinkedIn:</strong> ${data.social.linkedin}</p>
                    <p style="margin: 4px 0;"><strong>Twitter:</strong> ${data.social.twitter}</p>
                </div>
                <div>
                    <h4 style="font-weight: 600; margin-bottom: 8px;">📊 Engagement</h4>
                    <p style="margin: 4px 0;"><strong>Last Visit:</strong> ${new Date(data.engagement.last_visit).toLocaleDateString()}</p>
                    <p style="margin: 4px 0;"><strong>Page Views:</strong> ${data.engagement.page_views}</p>
                    <p style="margin: 4px 0;"><strong>Email Opens:</strong> ${data.engagement.email_opens}</p>
                    <p style="margin: 4px 0;"><strong>Email Clicks:</strong> ${data.engagement.email_clicks}</p>
                </div>
            </div>
        `;
    },

    toggleResultDetails(index) {
        const details = document.getElementById(`result-${index}`);
        if (details) {
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
        }
    },

    downloadResults() {
        const csv = this.results.map(r => ({
            email: r.lead.email,
            status: r.success ? 'Success' : 'Failed',
            company: r.success ? r.data.company.name : '',
            industry: r.success ? r.data.company.industry : '',
            employees: r.success ? r.data.company.employees : '',
            linkedin: r.success ? r.data.social.linkedin : ''
        }));

        const headers = Object.keys(csv[0] || {});
        const csvContent = [
            headers.join(','),
            ...csv.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enrichment-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Results downloaded!', 'success');
    },

    // Helper methods
    getInitials(lead) {
        const first = lead.first_name ? lead.first_name.charAt(0) : '';
        const last = lead.last_name ? lead.last_name.charAt(0) : '';
        return (first + last).toUpperCase() || lead.email.charAt(0).toUpperCase();
    },

    formatName(lead) {
        if (lead.first_name || lead.last_name) {
            return `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
        }
        return lead.email.split('@')[0];
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toastEl = document.createElement('div');
        toastEl.className = `toast ${type}`;
        toastEl.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(toastEl);
        setTimeout(() => toastEl.remove(), 5000);
    }
};

// Make Enrichment available globally
window.Enrichment = Enrichment;
