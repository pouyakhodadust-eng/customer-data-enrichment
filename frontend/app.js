/**
 * Main Application - Customer Data Enrichment Engine
 * Entry point for the SPA
 */

const App = {
    currentPage: 'dashboard',
    theme: 'light',
    isAuthenticated: false,
    user: {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        avatar: 'JD'
    },

    init() {
        // Check authentication
        this.checkAuth();
        
        // If not authenticated, show login overlay or redirect
        if (!this.isAuthenticated) {
            this.showAuthOverlay();
            return;
        }
        
        this.loadTheme();
        this.loadUser();
        this.setupNavigation();
        this.setupModals();
        this.setupThemeToggle();
        this.setupMobileMenu();
        this.setupLogout();
        this.loadCurrentPage();
        
        // Mark first load complete
        document.body.classList.add('loaded');
    },

    checkAuth() {
        const stored = localStorage.getItem('user');
        this.isAuthenticated = !!stored;
        if (stored) {
            this.user = JSON.parse(stored);
        }
    },

    showAuthOverlay() {
        // Remove any existing overlay
        const existingOverlay = document.querySelector('.auth-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'auth-overlay';
        overlay.innerHTML = `
            <div class="auth-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px; color: var(--primary);">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <h2>Authentication Required</h2>
                <p>Please sign in to access the Customer Data Enrichment Engine.</p>
                <a href="login.html" class="btn btn-primary">Sign In</a>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('remember');
        window.location.href = 'login.html';
    },

    setupLogout() {
        // Add logout functionality to user menu
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.style.cursor = 'pointer';
            userInfo.title = 'Click to logout';
            userInfo.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    this.logout();
                }
            });
        }
    },

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    },

    setTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update toggle button
        const sunIcon = document.querySelector('#theme-toggle .sun-icon');
        const moonIcon = document.querySelector('#theme-toggle .moon-icon');
        if (theme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    },

    setupThemeToggle() {
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            const newTheme = this.theme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        });
    },

    setupMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        
        menuToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    },

    loadUser() {
        // Try to load from localStorage
        const stored = localStorage.getItem('user');
        if (stored) {
            this.user = JSON.parse(stored);
        }
        
        // Update UI
        const userName = document.getElementById('user-name');
        const userRole = document.getElementById('user-role');
        const userAvatar = document.getElementById('user-avatar');
        
        if (userName) userName.textContent = this.user.name || 'Guest';
        if (userRole) userRole.textContent = this.user.role || 'User';
        if (userAvatar) {
            userAvatar.textContent = this.user.avatar || (this.user.name ? this.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'G');
        }
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.navigateTo(page);
                }
            });
        });
    },

    navigateTo(page) {
        if (page === this.currentPage) return;
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        // Update page title and breadcrumb
        const titles = {
            dashboard: 'Dashboard',
            leads: 'Leads Management',
            enrichment: 'Data Enrichment',
            analytics: 'Analytics',
            workflows: 'Workflows',
            settings: 'Settings'
        };
        
        const breadcrumbs = {
            dashboard: 'Home / Overview',
            leads: 'Home / Leads',
            enrichment: 'Home / Enrichment',
            analytics: 'Home / Analytics',
            workflows: 'Home / Workflows',
            settings: 'Home / Settings'
        };
        
        const pageTitle = document.getElementById('page-title');
        const breadcrumb = document.getElementById('breadcrumb');
        
        if (pageTitle) pageTitle.textContent = titles[page] || page;
        if (breadcrumb) breadcrumb.textContent = breadcrumbs[page] || page;
        
        // Close mobile menu
        document.getElementById('sidebar')?.classList.remove('open');
        
        // Load page content
        this.currentPage = page;
        this.loadCurrentPage();
        
        // Save to localStorage
        localStorage.setItem('last_page', page);
    },

    loadCurrentPage() {
        switch (this.currentPage) {
            case 'dashboard':
                Dashboard.init();
                break;
            case 'leads':
                Leads.init();
                break;
            case 'enrichment':
                this.loadEnrichmentPage();
                break;
            case 'analytics':
                this.loadAnalyticsPage();
                break;
            case 'workflows':
                this.loadWorkflowsPage();
                break;
            case 'settings':
                Settings.init();
                Settings.showSection('general');
                break;
            default:
                Dashboard.init();
        }
    },

    loadEnrichmentPage() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Data Enrichment</h2>
                    <button class="btn btn-primary" onclick="Enrichment.openModal()">
                        ⚡ Start Bulk Enrichment
                    </button>
                </div>
                <p style="color: var(--text-muted); margin-bottom: 24px;">
                    Enrich your leads with data from multiple providers. Select leads from the 
                    <a href="#" onclick="App.navigateTo('leads'); return false;">Leads page</a> 
                    or start a new enrichment below.
                </p>
                
                <div class="enrichment-options" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                    <div class="option-card" style="padding: 24px; border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); cursor: pointer; transition: var(--transition);" onclick="Enrichment.openModal()">
                        <div style="font-size: 2rem; margin-bottom: 16px;">📋</div>
                        <h3 style="font-weight: 600; margin-bottom: 8px;">Enrich Selected Leads</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Select specific leads from your list to enrich</p>
                    </div>
                    
                    <div class="option-card" style="padding: 24px; border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); cursor: pointer; transition: var(--transition);" onclick="Enrichment.openModal(Leads.leads.map(l => l.id))">
                        <div style="font-size: 2rem; margin-bottom: 16px;">🔄</div>
                        <h3 style="font-weight: 600; margin-bottom: 8px;">Enrich All Leads</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Enrich all leads in your database</p>
                    </div>
                    
                    <div class="option-card" style="padding: 24px; border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); cursor: pointer; transition: var(--transition);">
                        <div style="font-size: 2rem; margin-bottom: 16px;">📥</div>
                        <h3 style="font-weight: 600; margin-bottom: 8px;">Import & Enrich</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Upload a CSV and enrich new contacts</p>
                    </div>
                </div>
                
                <div style="margin-top: 32px;">
                    <h3 style="font-weight: 600; margin-bottom: 16px;">Recent Enrichments</h3>
                    <div class="empty-state" style="padding: 40px;">
                        <div class="empty-icon">📦</div>
                        <div class="empty-title">No enrichments yet</div>
                        <div class="empty-description">Start your first enrichment to see results here</div>
                    </div>
                </div>
            </div>
        `;
    },

    loadAnalyticsPage() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 24px;">
                <div class="stat-card">
                    <div class="stat-icon primary">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">1,247</div>
                        <div class="stat-label">Total Leads</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">✓</div>
                    <div class="stat-content">
                        <div class="stat-value">892</div>
                        <div class="stat-label">Enriched</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">🔥</div>
                    <div class="stat-content">
                        <div class="stat-value">156</div>
                        <div class="stat-label">Hot Leads</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info">📈</div>
                    <div class="stat-content">
                        <div class="stat-value">67%</div>
                        <div class="stat-label">Enrichment Rate</div>
                    </div>
                </div>
            </div>
            
            <div class="charts-grid">
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">Enrichment Over Time</h3>
                    </div>
                    <div style="height: 300px; display: flex; align-items: center; justify-content: center;">
                        <canvas id="analytics-enrichment-chart"></canvas>
                    </div>
                </div>
                
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">Lead Score Distribution</h3>
                    </div>
                    <div style="height: 300px; display: flex; align-items: center; justify-content: center;">
                        <canvas id="analytics-score-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="card" style="margin-top: 24px;">
                <div class="card-header">
                    <h3 class="card-title">Top Performing Sources</h3>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th>Leads</th>
                            <th>Enriched</th>
                            <th>Avg Score</th>
                            <th>Hot Leads</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>🌐 Website</td>
                            <td>437</td>
                            <td>312</td>
                            <td>62</td>
                            <td>58</td>
                        </tr>
                        <tr>
                            <td>💼 LinkedIn</td>
                            <td>312</td>
                            <td>245</td>
                            <td>71</td>
                            <td>45</td>
                        </tr>
                        <tr>
                            <td>👥 Referrals</td>
                            <td>225</td>
                            <td>198</td>
                            <td>78</td>
                            <td>32</td>
                        </tr>
                        <tr>
                            <td>📅 Events</td>
                            <td>150</td>
                            <td>89</td>
                            <td>54</td>
                            <td>15</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Initialize charts
        this.initAnalyticsCharts();
    },

    initAnalyticsCharts() {
        // Enrichment over time chart
        const ctx1 = document.getElementById('analytics-enrichment-chart');
        if (ctx1) {
            new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: this.getLast30Days(),
                    datasets: [{
                        label: 'Enrichments',
                        data: this.generateRandomData(30, 10, 50),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { beginAtZero: true }
                    }
                }
            });
        }
        
        // Score distribution chart
        const ctx2 = document.getElementById('analytics-score-chart');
        if (ctx2) {
            new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Hot (80+)', 'Warm (50-79)', 'Cold (<50)'],
                    datasets: [{
                        data: [156, 423, 668],
                        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    },

    getLast30Days() {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return days;
    },

    generateRandomData(count, min, max) {
        return Array.from({ length: count }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    },

    loadWorkflowsPage() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Workflow Automation</h2>
                    <button class="btn btn-primary">
                        ➕ Create Workflow
                    </button>
                </div>
                <p style="color: var(--text-muted); margin-bottom: 24px;">
                    Automate your enrichment workflows with n8n. Connect triggers, enrich leads, and update your CRM automatically.
                </p>
                
                <div class="empty-state">
                    <div class="empty-icon">⚡</div>
                    <div class="empty-title">No workflows configured</div>
                    <div class="empty-description">
                        <p style="margin-bottom: 16px;">Create automated workflows to:</p>
                        <ul style="text-align: left; max-width: 400px; margin: 0 auto; color: var(--text-muted);">
                            <li style="margin-bottom: 8px;">Enrich new leads automatically</li>
                            <li style="margin-bottom: 8px;">Score leads when data changes</li>
                            <li style="margin-bottom: 8px;">Send notifications to Slack</li>
                            <li style="margin-bottom: 8px;">Sync with CRM platforms</li>
                        </ul>
                    </div>
                    <button class="btn btn-primary" onclick="window.open('http://89.167.18.145:5678', '_blank')">
                        Open n8n Editor
                    </button>
                </div>
            </div>
        `;
    },

    setupModals() {
        // Lead form
        document.getElementById('lead-form')?.addEventListener('submit', (e) => {
            Leads.saveLead(e);
        });

        // Close modal buttons
        document.querySelectorAll('.close-btn, .close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
                
                // Re-enable form inputs
                document.querySelectorAll('#lead-form input, #lead-form select, #lead-form textarea').forEach(input => {
                    input.readOnly = false;
                });
            });
        });

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                overlay.closest('.modal').classList.remove('active');
            });
        });
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toastEl = document.createElement('div');
        toastEl.className = `toast ${type}`;
        toastEl.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠️' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(toastEl);
        
        setTimeout(() => {
            toastEl.style.animation = 'toastSlideIn 0.3s ease reverse';
            setTimeout(() => toastEl.remove(), 300);
        }, 5000);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App available globally
window.App = App;
