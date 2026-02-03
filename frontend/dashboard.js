// Configuration
const CONFIG = {
  apiUrl: window.API_URL || 'http://localhost:3000',
  defaultPageSize: 20,
  chartColors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    dark: '#1e293b',
    light: '#f8fafc',
  }
};

// Global state
let state = {
  currentPage: 'dashboard',
  leads: [],
  stats: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTheme();
  loadDashboard();
  initModals();
  initForms();
});

// Theme toggle
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) {
        navigateTo(page);
      }
    });
  });
}

function navigateTo(page) {
  state.currentPage = page;
  
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });
  
  // Update page title
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    leads: 'Lead Management',
    enrichment: 'Data Enrichment',
    workflows: 'Workflows',
    analytics: 'Analytics',
    settings: 'Settings'
  };
  
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
  
  // Load page content
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'leads':
      loadLeads();
      break;
    case 'enrichment':
      loadEnrichment();
      break;
    default:
      loadDashboard();
  }
}

// Dashboard
async function loadDashboard() {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  
  contentArea.innerHTML = '<div class="loading">Loading dashboard...</div>';
  
  try {
    // Fetch stats
    const stats = await fetchAPI('/api/v1/leads/stats/overview');
    state.stats = stats;
    
    // Fetch recent leads
    const leadsResponse = await fetchAPI('/api/v1/leads?limit=5');
    
    contentArea.innerHTML = renderDashboard(stats, leadsResponse.data);
    initDashboardCharts(stats);
  } catch (error) {
    contentArea.innerHTML = `<div class="error">Error loading dashboard: ${error.message}</div>`;
  }
}

function renderDashboard(stats: any, recentLeads: any[]) {
  return `
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">${stats.total_leads || 0}</span>
          <span class="stat-label">Total Leads</span>
        </div>
        <div class="stat-trend up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
          +12.5%
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #34d399);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">${stats.qualified_leads || 0}</span>
          <span class="stat-label">Qualified Leads</span>
        </div>
        <div class="stat-trend up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
          +8.2%
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">${stats.hot_leads || 0}</span>
          <span class="stat-label">Hot Leads</span>
        </div>
        <div class="stat-trend up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
          +15.3%
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #60a5fa);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">${Math.round(stats.avg_score || 0)}</span>
          <span class="stat-label">Avg Score</span>
        </div>
        <div class="stat-trend up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
          +5.1%
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="chart-card">
        <h3>Lead Sources</h3>
        <canvas id="sources-chart"></canvas>
      </div>
      <div class="chart-card">
        <h3>Score Distribution</h3>
        <canvas id="score-chart"></canvas>
      </div>
    </div>

    <!-- Pipeline & Recent Leads -->
    <div class="data-row">
      <div class="pipeline-card">
        <h3>Pipeline Overview</h3>
        <div class="pipeline-stages">
          ${renderPipelineStages(stats)}
        </div>
      </div>
      
      <div class="recent-leads-card">
        <div class="card-header">
          <h3>Recent Leads</h3>
          <a href="#" class="view-all" onclick="navigateTo('leads'); return false;">View All</a>
        </div>
        <div class="leads-list">
          ${recentLeads.map(lead => renderLeadItem(lead)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderPipelineStages(stats: any) {
  const stages = [
    { key: 'new_leads', label: 'New', color: '#6366f1' },
    { key: 'contacted', label: 'Contacted', color: '#8b5cf6' },
    { key: 'qualified', label: 'Qualified', color: '#10b981' },
    { key: 'proposal', label: 'Proposal', color: '#f59e0b' },
    { key: 'negotiation', label: 'Negotiation', color: '#ef4444' },
  ];
  
  return stages.map(stage => `
    <div class="pipeline-stage">
      <div class="stage-header">
        <span class="stage-dot" style="background: ${stage.color}"></span>
        <span class="stage-label">${stage.label}</span>
      </div>
      <span class="stage-count">${stats[stage.key] || 0}</span>
      <div class="stage-bar">
        <div class="stage-progress" style="width: ${Math.min(100, ((stats[stage.key] || 0) / Math.max(stats.total_leads, 1)) * 100)}%; background: ${stage.color}"></div>
      </div>
    </div>
  `).join('');
}

function renderLeadItem(lead: any) {
  const score = lead.total_score || 0;
  const scoreClass = score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold';
  
  return `
    <div class="lead-item">
      <div class="lead-avatar">${(lead.first_name?.[0] || lead.email[0]).toUpperCase()}</div>
      <div class="lead-info">
        <span class="lead-name">${lead.first_name || ''} ${lead.last_name || ''}</span>
        <span class="lead-company">${lead.company_name || 'Unknown'}</span>
      </div>
      <div class="lead-score ${scoreClass}">${score}</div>
    </div>
  `;
}

function initDashboardCharts(stats: any) {
  // Sources chart
  const sourcesCtx = document.getElementById('sources-chart');
  if (sourcesCtx) {
    new Chart(sourcesCtx, {
      type: 'doughnut',
      data: {
        labels: ['Website', 'Referral', 'LinkedIn', 'Event', 'Paid Ads'],
        datasets: [{
          data: [35, 25, 20, 12, 8],
          backgroundColor: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
  
  // Score distribution chart
  const scoreCtx = document.getElementById('score-chart');
  if (scoreCtx) {
    new Chart(scoreCtx, {
      type: 'bar',
      data: {
        labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
        datasets: [{
          label: 'Leads',
          data: [
            stats.cold_leads || 10,
            25,
            stats.warm_leads || 30,
            stats.hot_leads || 20,
            15
          ],
          backgroundColor: ['#ef4444', '#f59e0b', '#fbbf24', '#34d399', '#10b981'],
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#334155' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

// API helper
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${CONFIG.apiUrl}${endpoint}`;
  
  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// Export for use in other modules
window.navigateTo = navigateTo;
window.fetchAPI = fetchAPI;
window.CONFIG = CONFIG;
window.state = state;
