/**
 * Dashboard Module - Customer Data Enrichment Engine
 */

const Dashboard = {
    charts: {},
    refreshInterval: null,

    init() {
        this.loadDashboard();
        this.setupRefresh();
    },

    async loadDashboard() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = this.getDashboardTemplate();
        
        try {
            await this.loadMetrics();
            this.initCharts();
        } catch (error) {
            console.error('Dashboard error:', error);
            this.showDemoData();
        }
    },

    async loadMetrics() {
        try {
            const response = await fetch('/api/v1/leads?limit=1');
            const data = await response.json();
            
            // Calculate metrics from leads data
            const leads = data.data || [];
            const totalLeads = data.total || leads.length;
            const enrichedLeads = leads.filter(l => l.enrichment_status === 'enriched').length;
            const hotLeads = leads.filter(l => l.score >= 80).length;
            const warmLeads = leads.filter(l => l.score >= 50 && l.score < 80).length;

            this.updateStats({
                totalLeads,
                enrichedLeads,
                hotLeads,
                warmLeads
            });
        } catch (error) {
            console.warn('Using demo metrics:', error.message);
        }
    },

    updateStats(metrics) {
        // Update stat cards with real or demo data
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 4) {
            statCards[0].querySelector('.stat-value').textContent = this.formatNumber(metrics.totalLeads || 1247);
            statCards[1].querySelector('.stat-value').textContent = this.formatNumber(metrics.enrichedLeads || 892);
            statCards[2].querySelector('.stat-value').textContent = this.formatNumber(metrics.hotLeads || 156);
            statCards[3].querySelector('.stat-value').textContent = this.formatNumber(metrics.warmLeads || 423);
        }
    },

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    initCharts() {
        this.initLeadSourcesChart();
        this.initEnrichmentChart();
        this.initScoreDistributionChart();
        this.initTrendChart();
    },

    initLeadSourcesChart() {
        const ctx = document.getElementById('leadSourcesChart');
        if (!ctx) return;

        this.charts.leadSources = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Website', 'LinkedIn', 'Referrals', 'Events', 'Paid Ads', 'Organic'],
                datasets: [{
                    data: [35, 25, 18, 12, 7, 3],
                    backgroundColor: [
                        '#6366f1',
                        '#22c55e',
                        '#f59e0b',
                        '#3b82f6',
                        '#ef4444',
                        '#8b5cf6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '70%'
            }
        });
    },

    initEnrichmentChart() {
        const ctx = document.getElementById('enrichmentChart');
        if (!ctx) return;

        this.charts.enrichment = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Clearbit', 'Hunter', 'FullContact', 'Apollo', 'ZoomInfo'],
                datasets: [{
                    label: 'Successful Enrichments',
                    data: [456, 389, 234, 189, 156],
                    backgroundColor: '#6366f1',
                    borderRadius: 6
                }, {
                    label: 'Failed',
                    data: [23, 45, 34, 28, 19],
                    backgroundColor: '#ef4444',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end'
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#e2e8f0' }
                    }
                }
            }
        });
    },

    initScoreDistributionChart() {
        const ctx = document.getElementById('scoreChart');
        if (!ctx) return;

        this.charts.score = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
                datasets: [{
                    label: 'Leads',
                    data: [234, 456, 389, 278, 156],
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
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#e2e8f0' }
                    }
                }
            }
        });
    },

    initTrendChart() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getLast7Days(),
                datasets: [{
                    label: 'New Leads',
                    data: this.generateRandomData(7, 20, 50),
                    borderColor: '#6366f1',
                    backgroundColor: 'transparent',
                    tension: 0.4
                }, {
                    label: 'Enriched',
                    data: this.generateRandomData(7, 15, 40),
                    borderColor: '#22c55e',
                    backgroundColor: 'transparent',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end'
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#e2e8f0' }
                    }
                }
            }
        });
    },

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        return days;
    },

    generateRandomData(count, min, max) {
        return Array.from({ length: count }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    },

    showDemoData() {
        // Update stat cards with demo data
        this.updateStats({
            totalLeads: 1247,
            enrichedLeads: 892,
            hotLeads: 156,
            warmLeads: 423
        });
    },

    setupRefresh() {
        // Auto-refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadMetrics();
        }, 5 * 60 * 1000);
    },

    getDashboardTemplate() {
        return `
            <!-- Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">1,247</div>
                        <div class="stat-label">Total Leads</div>
                        <span class="stat-change positive">↑ 12% this month</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">✓</div>
                    <div class="stat-content">
                        <div class="stat-value">892</div>
                        <div class="stat-label">Enriched Leads</div>
                        <span class="stat-change positive">↑ 8% this month</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">🔥</div>
                    <div class="stat-content">
                        <div class="stat-value">156</div>
                        <div class="stat-label">Hot Leads</div>
                        <span class="stat-change positive">↑ 23% this month</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">423</div>
                        <div class="stat-label">Warm Leads</div>
                        <span class="stat-change negative">↓ 3% this month</span>
                    </div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div class="charts-grid">
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">Lead Sources</h3>
                    </div>
                    <div style="height: 280px; display: flex; align-items: center; justify-content: center;">
                        <canvas id="leadSourcesChart"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">Enrichment by Provider</h3>
                        <div class="chart-actions">
                            <button class="chart-period active">Week</button>
                            <button class="chart-period">Month</button>
                            <button class="chart-period">Year</button>
                        </div>
                    </div>
                    <div style="height: 280px;">
                        <canvas id="enrichmentChart"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">Score Distribution</h3>
                    </div>
                    <div style="height: 280px;">
                        <canvas id="scoreChart"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">Lead Trends</h3>
                        <div class="chart-actions">
                            <button class="chart-period active">7D</button>
                            <button class="chart-period">30D</button>
                            <button class="chart-period">90D</button>
                        </div>
                    </div>
                    <div style="height: 280px;">
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Activity</h3>
                    <button class="btn btn-secondary btn-sm">View All</button>
                </div>
                <div id="activity-list">
                    ${this.getRecentActivityItems()}
                </div>
            </div>
        `;
    },

    getRecentActivityItems() {
        const activities = [
            { type: 'enrichment', icon: '✓', title: 'Lead enriched', description: 'john@company.com via Clearbit', time: '2 min ago', color: 'success' },
            { type: 'lead', icon: '👤', title: 'New lead added', description: 'sarah@enterprise.io from LinkedIn', time: '15 min ago', color: 'primary' },
            { type: 'score', icon: '📈', title: 'Lead scored hot', description: 'mike@startup.com scored 92/100', time: '1 hour ago', color: 'warning' },
            { type: 'bulk', icon: '📦', title: 'Bulk enrichment complete', description: '50 leads enriched successfully', time: '2 hours ago', color: 'info' },
            { type: 'delete', icon: '🗑️', title: 'Lead removed', description: 'inactive@oldcompany.com', time: '3 hours ago', color: 'danger' }
        ];

        return activities.map(activity => `
            <div class="activity-item" style="display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border-color);">
                <div class="activity-icon" style="width: 40px; height: 40px; border-radius: 50%; background: var(--${activity.color}-light); display: flex; align-items: center; justify-content: center;">
                    ${activity.icon}
                </div>
                <div class="activity-content" style="flex: 1;">
                    <div style="font-weight: 500;">${activity.title}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">${activity.description}</div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${activity.time}</div>
            </div>
        `).join('');
    },

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
};

// Make Dashboard available globally
window.Dashboard = Dashboard;
