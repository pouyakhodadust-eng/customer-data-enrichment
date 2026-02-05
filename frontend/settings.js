/**
 * Settings Module - Customer Data Enrichment Engine
 */

const Settings = {
    currentSection: 'general',
    providers: {
        clearbit: { configured: false, apiKey: '' },
        hunter: { configured: false, apiKey: '' },
        fullcontact: { configured: false, apiKey: '' }
    },
    scoring: {
        engagement: 25,
        demographic: 25,
        firmographic: 25,
        behavioral: 25
    },

    init() {
        this.loadSettings();
        this.setupEventListeners();
    },

    loadSettings() {
        // Load from localStorage or API
        const stored = localStorage.getItem('enrichment_settings');
        if (stored) {
            const settings = JSON.parse(stored);
            this.providers = settings.providers || this.providers;
            this.scoring = settings.scoring || this.scoring;
        }

        // Check which providers have API keys configured
        this.checkProviderStatus();
    },

    saveSettings() {
        const settings = {
            providers: this.providers,
            scoring: this.scoring
        };
        localStorage.setItem('enrichment_settings', JSON.stringify(settings));
    },

    async checkProviderStatus() {
        // In production, this would verify API keys with the backend
        ['clearbit', 'hunter', 'fullcontact'].forEach(provider => {
            const key = localStorage.getItem(`${provider}_api_key`);
            if (key) {
                this.providers[provider].configured = true;
                this.providers[provider].apiKey = key;
            }
        });
        this.updateProviderUI();
    },

    updateProviderUI() {
        document.querySelectorAll('.provider-card').forEach(card => {
            const provider = card.dataset.provider;
            if (this.providers[provider]?.configured) {
                card.classList.add('configured');
                card.querySelector('.provider-status span:last-child').textContent = '✓ Configured';
            } else {
                card.classList.remove('configured');
                card.querySelector('.provider-status span:last-child').textContent = 'Configure API key';
            }
        });
    },

    setupEventListeners() {
        // Settings navigation
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.showSection(section);
                
                document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // API Key inputs
        ['clearbit', 'hunter', 'fullcontact'].forEach(provider => {
            const input = document.getElementById(`${provider}-api-key`);
            const saveBtn = document.getElementById(`save-${provider}-key`);
            
            if (input && saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveApiKey(provider, input.value);
                });

                // Show/hide password
                const toggleBtn = document.getElementById(`toggle-${provider}-key`);
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', () => {
                        input.type = input.type === 'password' ? 'text' : 'password';
                    });
                }
            }
        });

        // Scoring sliders
        ['engagement', 'demographic', 'firmographic', 'behavioral'].forEach(metric => {
            const slider = document.getElementById(`score-${metric}`);
            const value = document.getElementById(`score-${metric}-value`);
            
            if (slider && value) {
                slider.addEventListener('input', () => {
                    value.textContent = slider.value;
                    this.scoring[metric] = parseInt(slider.value);
                    this.updateScoringTotal();
                });
            }
        });

        // Save scoring
        document.getElementById('save-scoring')?.addEventListener('click', () => {
            this.saveScoring();
        });

        // Reset scoring
        document.getElementById('reset-scoring')?.addEventListener('click', () => {
            this.resetScoring();
        });

        // Test connection buttons
        document.querySelectorAll('.test-connection-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const provider = btn.dataset.provider;
                this.testProviderConnection(provider);
            });
        });
    },

    showSection(section) {
        this.currentSection = section;
        
        document.querySelectorAll('.settings-section').forEach(s => {
            s.classList.remove('active');
        });
        
        document.getElementById(`section-${section}`)?.classList.add('active');
    },

    saveApiKey(provider, key) {
        if (!key || key.length < 10) {
            this.showToast('Please enter a valid API key', 'error');
            return;
        }

        this.providers[provider].configured = true;
        this.providers[provider].apiKey = key;
        localStorage.setItem(`${provider}_api_key`, key);
        this.saveSettings();
        this.updateProviderUI();
        this.showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved!`, 'success');
    },

    async testProviderConnection(provider) {
        const btn = document.querySelector(`[data-provider="${provider}"] .test-connection-btn`);
        const originalText = btn.textContent;
        
        btn.textContent = 'Testing...';
        btn.disabled = true;

        try {
            // In production, this would make an actual API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Simulate success/failure
            if (Math.random() > 0.2) {
                this.showToast(`${provider} connection successful!`, 'success');
            } else {
                throw new Error('Invalid API key or rate limit exceeded');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    },

    updateScoringTotal() {
        const total = Object.values(this.scoring).reduce((a, b) => a + b, 0);
        const totalEl = document.getElementById('scoring-total');
        if (totalEl) {
            totalEl.textContent = `${total}%`;
            totalEl.style.color = total === 100 ? 'var(--success)' : 'var(--warning)';
        }
    },

    saveScoring() {
        this.saveSettings();
        this.showToast('Scoring weights saved!', 'success');
    },

    resetScoring() {
        this.scoring = {
            engagement: 25,
            demographic: 25,
            firmographic: 25,
            behavioral: 25
        };

        ['engagement', 'demographic', 'firmographic', 'behavioral'].forEach(metric => {
            const slider = document.getElementById(`score-${metric}`);
            const value = document.getElementById(`score-${metric}-value`);
            if (slider) slider.value = 25;
            if (value) value.textContent = 25;
        });

        this.updateScoringTotal();
        this.showToast('Scoring reset to defaults', 'info');
    },

    // General settings
    saveGeneralSettings() {
        const settings = {
            companyName: document.getElementById('company-name')?.value || '',
            timezone: document.getElementById('timezone')?.value || 'UTC',
            dateFormat: document.getElementById('date-format')?.value || 'MM/DD/YYYY',
            notifications: {
                email: document.getElementById('notify-email')?.checked || false,
                slack: document.getElementById('notify-slack')?.checked || false,
                enrichmentComplete: document.getElementById('notify-enrichment')?.checked || false,
                scoreAlerts: document.getElementById('notify-scores')?.checked || false
            }
        };

        localStorage.setItem('general_settings', JSON.stringify(settings));
        this.showToast('General settings saved!', 'success');
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
    },

    getSettingsTemplate() {
        return `
            <div class="settings-grid">
                <div class="settings-nav">
                    <button class="settings-nav-item active" data-section="general">
                        ⚙️ General
                    </button>
                    <button class="settings-nav-item" data-section="providers">
                        🔌 API Providers
                    </button>
                    <button class="settings-nav-item" data-section="scoring">
                        📊 Scoring Weights
                    </button>
                    <button class="settings-nav-item" data-section="notifications">
                        🔔 Notifications
                    </button>
                    <button class="settings-nav-item" data-section="integrations">
                        🔗 Integrations
                    </button>
                    <button class="settings-nav-item" data-section="billing">
                        💳 Billing
                    </button>
                </div>
                
                <div class="settings-content">
                    <!-- General Settings -->
                    <div class="settings-section active" id="section-general">
                        <h2 class="settings-title">General Settings</h2>
                        <p class="settings-description">Configure basic application settings</p>
                        
                        <div class="form-group">
                            <label>Company Name</label>
                            <input type="text" id="company-name" placeholder="Your Company">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Timezone</label>
                                <select id="timezone">
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">Eastern Time</option>
                                    <option value="America/Los_Angeles">Pacific Time</option>
                                    <option value="Europe/London">London</option>
                                    <option value="Europe/Berlin">Berlin</option>
                                    <option value="Asia/Tokyo">Tokyo</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Date Format</label>
                                <select id="date-format">
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <button class="btn btn-primary" onclick="Settings.saveGeneralSettings()">Save Settings</button>
                        </div>
                    </div>
                    
                    <!-- API Providers -->
                    <div class="settings-section" id="section-providers">
                        <h2 class="settings-title">API Providers</h2>
                        <p class="settings-description">Configure API keys for data enrichment providers</p>
                        
                        <!-- Clearbit -->
                        <div class="provider-config" style="margin-bottom: 32px;">
                            <h3 style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <span style="font-size: 1.5rem;">🔍</span>
                                Clearbit
                            </h3>
                            <div class="form-group">
                                <label>API Key</label>
                                <div style="display: flex; gap: 12px;">
                                    <input type="password" id="clearbit-api-key" placeholder="sk_live_..." style="flex: 1;">
                                    <button class="btn btn-secondary" id="toggle-clearbit-key">👁️</button>
                                    <button class="btn btn-secondary" onclick="Settings.testProviderConnection('clearbit')">Test</button>
                                </div>
                                <small style="color: var(--text-muted);">Get your API key from <a href="https://clearbit.com" target="_blank">clearbit.com</a></small>
                            </div>
                            <button class="btn btn-primary" id="save-clearbit-key">Save Clearbit Key</button>
                        </div>
                        
                        <!-- Hunter -->
                        <div class="provider-config" style="margin-bottom: 32px;">
                            <h3 style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <span style="font-size: 1.5rem;">🎯</span>
                                Hunter
                            </h3>
                            <div class="form-group">
                                <label>API Key</label>
                                <div style="display: flex; gap: 12px;">
                                    <input type="password" id="hunter-api-key" placeholder="your-api-key" style="flex: 1;">
                                    <button class="btn btn-secondary" id="toggle-hunter-key">👁️</button>
                                    <button class="btn btn-secondary" onclick="Settings.testProviderConnection('hunter')">Test</button>
                                </div>
                                <small style="color: var(--text-muted);">Get your API key from <a href="https://hunter.io" target="_blank">hunter.io</a></small>
                            </div>
                            <button class="btn btn-primary" id="save-hunter-key">Save Hunter Key</button>
                        </div>
                        
                        <!-- FullContact -->
                        <div class="provider-config">
                            <h3 style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                                <span style="font-size: 1.5rem;">📇</span>
                                FullContact
                            </h3>
                            <div class="form-group">
                                <label>API Key</label>
                                <div style="display: flex; gap: 12px;">
                                    <input type="password" id="fullcontact-api-key" placeholder="your-api-key" style="flex: 1;">
                                    <button class="btn btn-secondary" id="toggle-fullcontact-key">👁️</button>
                                    <button class="btn btn-secondary" onclick="Settings.testProviderConnection('fullcontact')">Test</button>
                                </div>
                                <small style="color: var(--text-muted);">Get your API key from <a href="https://fullcontact.com" target="_blank">fullcontact.com</a></small>
                            </div>
                            <button class="btn btn-primary" id="save-fullcontact-key">Save FullContact Key</button>
                        </div>
                    </div>
                    
                    <!-- Scoring Weights -->
                    <div class="settings-section" id="section-scoring">
                        <h2 class="settings-title">Scoring Weights</h2>
                        <p class="settings-description">Configure how leads are scored based on different factors</p>
                        
                        <div class="scoring-grid">
                            <div class="scoring-item">
                                <label>Engagement Score</label>
                                <input type="range" id="score-engagement" min="0" max="100" value="25">
                                <span class="scoring-value" id="score-engagement-value">25%</span>
                            </div>
                            <div class="scoring-item">
                                <label>Demographic Score</label>
                                <input type="range" id="score-demographic" min="0" max="100" value="25">
                                <span class="scoring-value" id="score-demographic-value">25%</span>
                            </div>
                            <div class="scoring-item">
                                <label>Firmographic Score</label>
                                <input type="range" id="score-firmographic" min="0" max="100" value="25">
                                <span class="scoring-value" id="score-firmographic-value">25%</span>
                            </div>
                            <div class="scoring-item">
                                <label>Behavioral Score</label>
                                <input type="range" id="score-behavioral" min="0" max="100" value="25">
                                <span class="scoring-value" id="score-behavioral-value">25%</span>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 24px 0;">
                            <span style="font-size: 1.25rem; font-weight: 600;">Total: </span>
                            <span id="scoring-total" style="font-size: 1.25rem; font-weight: 600; color: var(--success);">100%</span>
                        </div>
                        
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button class="btn btn-primary" id="save-scoring">Save Weights</button>
                            <button class="btn btn-secondary" id="reset-scoring">Reset to Defaults</button>
                        </div>
                    </div>
                    
                    <!-- Notifications -->
                    <div class="settings-section" id="section-notifications">
                        <h2 class="settings-title">Notification Preferences</h2>
                        <p class="settings-description">Choose how you want to be notified</p>
                        
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" id="notify-email">
                                <span>Email Notifications</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" id="notify-slack">
                                <span>Slack Notifications</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" id="notify-enrichment">
                                <span>Enrichment Complete</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" id="notify-scores">
                                <span>Hot Lead Alerts</span>
                            </label>
                        </div>
                        
                        <button class="btn btn-primary" onclick="Settings.saveNotificationSettings()">Save Preferences</button>
                    </div>
                    
                    <!-- Integrations -->
                    <div class="settings-section" id="section-integrations">
                        <h2 class="settings-title">Integrations</h2>
                        <p class="settings-description">Connect with third-party services</p>
                        
                        <div class="integrations-list">
                            <div class="integration-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 1.5rem;">📊</span>
                                    <div>
                                        <div style="font-weight: 500;">Salesforce</div>
                                        <small style="color: var(--text-muted);">CRM Integration</small>
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-sm">Connect</button>
                            </div>
                            
                            <div class="integration-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 1.5rem;">📧</span>
                                    <div>
                                        <div style="font-weight: 500;">HubSpot</div>
                                        <small style="color: var(--text-muted);">Marketing Automation</small>
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-sm">Connect</button>
                            </div>
                            
                            <div class="integration-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 1.5rem;">💬</span>
                                    <div>
                                        <div style="font-weight: 500;">Slack</div>
                                        <small style="color: var(--text-muted);">Team Notifications</small>
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-sm">Connect</button>
                            </div>
                            
                            <div class="integration-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid var(--border-color); border-radius: var(--border-radius);">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 1.5rem;">📝</span>
                                    <div>
                                        <div style="font-weight: 500;">Zapier</div>
                                        <small style="color: var(--text-muted);">Workflow Automation</small>
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-sm">Connect</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Billing -->
                    <div class="settings-section" id="section-billing">
                        <h2 class="settings-title">Billing & Subscription</h2>
                        <p class="settings-description">Manage your subscription and payment methods</p>
                        
                        <div class="card" style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 600; font-size: 1.125rem;">Current Plan</div>
                                    <div style="color: var(--text-muted);">Professional Plan</div>
                                </div>
                                <span style="padding: 8px 16px; background: var(--success-light); color: var(--success); border-radius: 20px; font-weight: 500;">Active</span>
                            </div>
                        </div>
                        
                        <div class="card" style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 600;">Monthly Usage</div>
                                    <div style="color: var(--text-muted);">1,247 / 5,000 enrichments</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600;">$49/month</div>
                                    <small style="color: var(--text-muted);">Renews Feb 5, 2026</small>
                                </div>
                            </div>
                            <div style="margin-top: 16px; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: 25%; height: 100%; background: var(--primary);"></div>
                            </div>
                        </div>
                        
                        <button class="btn btn-primary" onclick="window.open('https://billing.stripe.com', '_blank')">Manage Subscription</button>
                    </div>
                </div>
            </div>
        `;
    }
};

// Make Settings available globally
window.Settings = Settings;
