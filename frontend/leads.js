/**
 * Leads Management Module - Customer Data Enrichment Engine
 */

const Leads = {
    leads: [],
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalLeads: 0,
    sortBy: 'created_at',
    sortOrder: 'desc',
    filters: {
        status: '',
        score: '',
        source: '',
        search: ''
    },
    selectedLeads: new Set(),

    init() {
        this.loadLeads();
        this.setupEventListeners();
    },

    async loadLeads(page = 1) {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = this.getLeadsTemplate();
        
        this.currentPage = page;
        
        try {
            const params = {
                page: this.currentPage,
                limit: this.perPage,
                sort: this.sortBy,
                order: this.sortOrder,
                ...this.filters
            };
            
            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await api.getLeads(params);
            
            if (response.success) {
                this.leads = response.data || [];
                this.totalLeads = response.total || this.leads.length;
                this.totalPages = Math.ceil(this.totalLeads / this.perPage);
                this.renderLeadsTable();
            } else {
                this.showDemoData();
            }
        } catch (error) {
            console.warn('Using demo leads data:', error.message);
            this.showDemoData();
        }
    },

    showDemoData() {
        this.leads = this.generateDemoLeads();
        this.totalLeads = this.leads.length;
        this.totalPages = Math.ceil(this.totalLeads / this.perPage);
        this.renderLeadsTable();
    },

    generateDemoLeads() {
        const companies = ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'DataFlow', 'CloudNine', 'InnovateTech', 'ScaleUp Labs', 'NextGen Software'];
        const sources = ['website', 'linkedin', 'referral', 'event', 'paid_ads', 'organic'];
        const firstNames = ['John', 'Sarah', 'Mike', 'Emily', 'David', 'Lisa', 'James', 'Anna', 'Robert', 'Maria'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        const titles = ['CEO', 'CTO', 'VP Engineering', 'Product Manager', 'Sales Director', 'Marketing Lead', 'Founder', 'Tech Lead'];
        
        return Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            email: `${firstNames[i % 10].toLowerCase()}.${lastNames[i % 10].toLowerCase()}@${companies[i % 8].toLowerCase().replace(/\s+/g, '')}.com`,
            first_name: firstNames[i % 10],
            last_name: lastNames[i % 10],
            company_name: companies[i % 8],
            job_title: titles[i % 8],
            source: sources[i % 6],
            score: Math.floor(Math.random() * 100),
            enrichment_status: Math.random() > 0.3 ? 'enriched' : 'pending',
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }));
    },

    renderLeadsTable() {
        const tbody = document.getElementById('leads-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.leads.map(lead => `
            <tr data-id="${lead.id}">
                <td>
                    <label class="checkbox">
                        <input type="checkbox" class="lead-checkbox" data-id="${lead.id}">
                    </label>
                </td>
                <td>
                    <div class="lead-info">
                        <div class="lead-avatar">${this.getInitials(lead)}</div>
                        <div class="lead-details">
                            <span class="lead-name">${this.formatName(lead)}</span>
                            <span class="lead-email">${lead.email}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="company-info">
                        <div class="company-logo">${lead.company_name ? lead.company_name.charAt(0) : '?'}</div>
                        <span>${lead.company_name || '-'}</span>
                    </div>
                </td>
                <td>
                    <span class="score-badge ${this.getScoreClass(lead.score)}">${lead.score}</span>
                </td>
                <td>
                    <span class="status-badge ${lead.enrichment_status}">${lead.enrichment_status}</span>
                </td>
                <td>${this.formatSource(lead.source)}</td>
                <td>${this.formatDate(lead.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" title="View" onclick="Leads.viewLead(${lead.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="action-btn" title="Edit" onclick="Leads.editLead(${lead.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="Leads.deleteLead(${lead.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.updatePagination();
        this.setupCheckboxListeners();
    },

    setupCheckboxListeners() {
        document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                if (e.target.checked) {
                    this.selectedLeads.add(id);
                } else {
                    this.selectedLeads.delete(id);
                }
                this.updateBulkActions();
            });
        });

        document.getElementById('select-all-leads')?.addEventListener('change', (e) => {
            document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
                checkbox.checked = e.target.checked;
                const id = parseInt(checkbox.dataset.id);
                if (e.target.checked) {
                    this.selectedLeads.add(id);
                } else {
                    this.selectedLeads.delete(id);
                }
            });
            this.updateBulkActions();
        });
    },

    updateBulkActions() {
        const bulkActions = document.getElementById('bulk-actions');
        if (bulkActions) {
            if (this.selectedLeads.size > 0) {
                bulkActions.classList.remove('hidden');
                bulkActions.querySelector('.selected-count').textContent = `${this.selectedLeads.size} leads selected`;
            } else {
                bulkActions.classList.add('hidden');
            }
        }
    },

    updatePagination() {
        const paginationInfo = document.querySelector('.pagination-info');
        const paginationButtons = document.querySelector('.pagination-buttons');
        
        if (paginationInfo) {
            const start = (this.currentPage - 1) * this.perPage + 1;
            const end = Math.min(this.currentPage * this.perPage, this.totalLeads);
            paginationInfo.textContent = `Showing ${start}-${end} of ${this.totalLeads} leads`;
        }

        if (paginationButtons) {
            let buttons = '';
            
            // Previous button
            buttons += `<button class="page-btn" onclick="Leads.loadLeads(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>←</button>`;
            
            // Page numbers
            const maxPages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
            let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
            
            if (endPage - startPage < maxPages - 1) {
                startPage = Math.max(1, endPage - maxPages + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                buttons += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="Leads.loadLeads(${i})">${i}</button>`;
            }
            
            // Next button
            buttons += `<button class="page-btn" onclick="Leads.loadLeads(${this.currentPage + 1})" ${this.currentPage === this.totalPages ? 'disabled' : ''}>→</button>`;
            
            paginationButtons.innerHTML = buttons;
        }
    },

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounceLoad();
            });
        }

        // Filters
        document.getElementById('filter-status')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.loadLeads(1);
        });

        document.getElementById('filter-score')?.addEventListener('change', (e) => {
            this.filters.score = e.target.value;
            this.loadLeads(1);
        });

        document.getElementById('filter-source')?.addEventListener('change', (e) => {
            this.filters.source = e.target.value;
            this.loadLeads(1);
        });

        // Add lead button
        document.getElementById('add-lead-btn')?.addEventListener('click', () => {
            this.openLeadModal();
        });
    },

    debounceLoad() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadLeads(1);
        }, 300);
    },

    openLeadModal(leadId = null) {
        const modal = document.getElementById('lead-modal');
        const form = document.getElementById('lead-form');
        const title = document.getElementById('lead-modal-title');
        const submitBtn = document.getElementById('lead-submit-btn');
        
        form.reset();
        document.getElementById('lead-id').value = '';
        
        if (leadId) {
            const lead = this.leads.find(l => l.id === leadId);
            if (lead) {
                title.textContent = 'Edit Lead';
                submitBtn.textContent = 'Save Changes';
                
                document.getElementById('lead-id').value = lead.id;
                document.getElementById('lead-email').value = lead.email || '';
                document.getElementById('lead-first-name').value = lead.first_name || '';
                document.getElementById('lead-last-name').value = lead.last_name || '';
                document.getElementById('lead-company').value = lead.company_name || '';
                document.getElementById('lead-job-title').value = lead.job_title || '';
                document.getElementById('lead-source').value = lead.source || 'website';
                document.getElementById('lead-phone').value = lead.phone || '';
                document.getElementById('lead-linkedin').value = lead.linkedin_url || '';
                document.getElementById('lead-tags').value = (lead.tags || []).join(', ');
                document.getElementById('lead-notes').value = lead.notes || '';
            }
        } else {
            title.textContent = 'Add New Lead';
            submitBtn.textContent = 'Create Lead';
        }
        
        modal.classList.add('active');
    },

    async saveLead(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const leadId = document.getElementById('lead-id').value;
        
        const leadData = {
            email: formData.get('email'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            company_name: formData.get('company_name'),
            job_title: formData.get('job_title'),
            source: formData.get('source'),
            phone: formData.get('phone'),
            linkedin_url: formData.get('linkedin_url'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(t => t) : [],
            notes: formData.get('notes')
        };

        try {
            let response;
            if (leadId) {
                response = await api.updateLead(leadId, leadData);
            } else {
                response = await api.createLead(leadData);
            }

            if (response.success) {
                this.showToast('Lead saved successfully!', 'success');
                this.closeLeadModal();
                this.loadLeads();
            } else {
                throw new Error(response.message || 'Failed to save lead');
            }
        } catch (error) {
            console.error('Save lead error:', error);
            this.showToast(error.message, 'error');
        }
    },

    closeLeadModal() {
        const modal = document.getElementById('lead-modal');
        modal.classList.remove('active');
    },

    viewLead(id) {
        const lead = this.leads.find(l => l.id === id);
        if (lead) {
            this.openLeadModal(id);
            // Disable form inputs for view mode
            document.querySelectorAll('#lead-form input, #lead-form select, #lead-form textarea').forEach(input => {
                input.readOnly = true;
            });
            document.getElementById('lead-submit-btn').textContent = 'Close';
            document.getElementById('lead-submit-btn').onclick = () => {
                this.closeLeadModal();
                this.loadLeads();
            };
        }
    },

    editLead(id) {
        this.openLeadModal(id);
    },

    async deleteLead(id) {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        
        try {
            const response = await api.deleteLead(id);
            if (response.success) {
                this.showToast('Lead deleted successfully!', 'success');
                this.loadLeads();
            } else {
                throw new Error(response.message || 'Failed to delete lead');
            }
        } catch (error) {
            console.error('Delete lead error:', error);
            this.showToast(error.message, 'error');
        }
    },

    async bulkDelete() {
        if (!confirm(`Are you sure you want to delete ${this.selectedLeads.size} leads?`)) return;
        
        try {
            const response = await api.bulkDeleteLead(Array.from(this.selectedLeads));
            if (response.success) {
                this.showToast(`${this.selectedLeads.size} leads deleted successfully!`, 'success');
                this.selectedLeads.clear();
                this.updateBulkActions();
                this.loadLeads();
            } else {
                throw new Error(response.message || 'Failed to delete leads');
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showToast(error.message, 'error');
        }
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

    getScoreClass(score) {
        if (score >= 80) return 'hot';
        if (score >= 50) return 'warm';
        return 'cold';
    },

    formatSource(source) {
        const sourceMap = {
            website: '🌐 Website',
            linkedin: '💼 LinkedIn',
            referral: '👥 Referral',
            event: '📅 Event',
            paid_ads: '📢 Paid Ads',
            organic: '🔍 Organic',
            other: '📌 Other'
        };
        return sourceMap[source] || source;
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    showToast(message, type = 'info') {
        const toast = {
            message,
            type,
            icon: type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'
        };
        
        const container = document.getElementById('toast-container');
        const toastEl = document.createElement('div');
        toastEl.className = `toast ${toast.type}`;
        toastEl.innerHTML = `
            <span class="toast-icon">${toast.icon}</span>
            <span class="toast-message">${toast.message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(toastEl);
        
        setTimeout(() => toastEl.remove(), 5000);
    },

    getLeadsTemplate() {
        return `
            <div class="data-table-container">
                <div class="table-header">
                    <div class="table-actions">
                        <div class="table-search">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input type="text" placeholder="Search leads..." id="global-search">
                        </div>
                        <div class="filter-group">
                            <select class="filter-select" id="filter-status">
                                <option value="">All Status</option>
                                <option value="enriched">Enriched</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>
                            <select class="filter-select" id="filter-score">
                                <option value="">All Scores</option>
                                <option value="hot">Hot (80+)</option>
                                <option value="warm">Warm (50-79)</option>
                                <option value="cold">Cold (&lt;50)</option>
                            </select>
                            <select class="filter-select" id="filter-source">
                                <option value="">All Sources</option>
                                <option value="website">Website</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="referral">Referral</option>
                                <option value="event">Event</option>
                                <option value="paid_ads">Paid Ads</option>
                                <option value="organic">Organic</option>
                            </select>
                        </div>
                    </div>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" id="bulk-actions" style="display:none;">
                            <span class="selected-count">0 selected</span>
                            <span onclick="Leads.bulkDelete()" style="margin-left:8px;cursor:pointer;">🗑️</span>
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="Enrichment.openModal(Array.from(Leads.selectedLeads))">
                            ⚡ Enrich Selected
                        </button>
                        <button class="btn btn-secondary btn-sm">
                            ⬇️ Export
                        </button>
                    </div>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:40px;">
                                <label class="checkbox">
                                    <input type="checkbox" id="select-all-leads">
                                </label>
                            </th>
                            <th onclick="Leads.sortBy='name';Leads.sortOrder=Leads.sortOrder==='asc'?'desc':'asc';Leads.loadLeads()">Lead</th>
                            <th onclick="Leads.sortBy='company';Leads.sortOrder=Leads.sortOrder==='asc'?'desc':'asc';Leads.loadLeads()">Company</th>
                            <th onclick="Leads.sortBy='score';Leads.sortOrder=Leads.sortOrder==='asc'?'desc':'asc';Leads.loadLeads()">Score</th>
                            <th>Status</th>
                            <th>Source</th>
                            <th onclick="Leads.sortBy='created_at';Leads.sortOrder=Leads.sortOrder==='asc'?'desc':'asc';Leads.loadLeads()">Added</th>
                            <th style="width:120px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="leads-table-body">
                        <tr><td colspan="8" class="loading"><div class="spinner"></div></td></tr>
                    </tbody>
                </table>
                
                <div class="pagination">
                    <span class="pagination-info">Loading...</span>
                    <div class="pagination-buttons"></div>
                </div>
            </div>
        `;
    }
};

// Make Leads available globally
window.Leads = Leads;
