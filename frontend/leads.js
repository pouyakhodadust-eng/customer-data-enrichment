// Leads management page
async function loadLeads() {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  
  contentArea.innerHTML = '<div class="loading">Loading leads...</div>';
  
  try {
    const response = await fetchAPI('/api/v1/leads');
    state.leads = response.data;
    state.pagination = response.pagination;
    
    contentArea.innerHTML = renderLeadsPage(response.data, response.pagination);
    initLeadsTable();
  } catch (error) {
    contentArea.innerHTML = `<div class="error">Error loading leads: ${error.message}</div>`;
  }
}

function renderLeadsPage(leads: any[], pagination: any) {
  return `
    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <select id="filter-status" onchange="filterLeads()">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <select id="filter-source" onchange="filterLeads()">
          <option value="">All Sources</option>
          <option value="website">Website</option>
          <option value="referral">Referral</option>
          <option value="linkedin">LinkedIn</option>
          <option value="event">Event</option>
          <option value="paid_ads">Paid Ads</option>
        </select>
        <select id="filter-score" onchange="filterLeads()">
          <option value="">All Scores</option>
          <option value="hot">Hot (80+)</option>
          <option value="warm">Warm (50-79)</option>
          <option value="cold">Cold (0-49)</option>
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-secondary" onclick="exportLeads()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
        <button class="btn btn-primary" onclick="bulkEnrich()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Bulk Enrich
        </button>
      </div>
    </div>

    <!-- Leads Table -->
    <div class="table-container">
      <table class="leads-table">
        <thead>
          <tr>
            <th><input type="checkbox" id="select-all" onchange="toggleSelectAll()"></th>
            <th>Lead</th>
            <th>Company</th>
            <th>Source</th>
            <th>Status</th>
            <th>Score</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="leads-tbody">
          ${leads.map(lead => renderLeadRow(lead)).join('')}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <span class="pagination-info">
        Showing ${((pagination.page - 1) * pagination.limit) + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}
      </span>
      <div class="pagination-buttons">
        <button class="btn btn-secondary" ${pagination.page === 1 ? 'disabled' : ''} onclick="changePage(${pagination.page - 1})">
          Previous
        </button>
        <button class="btn btn-secondary" ${pagination.page >= pagination.total_pages ? 'disabled' : ''} onclick="changePage(${pagination.page + 1})">
          Next
        </button>
      </div>
    </div>
  `;
}

function renderLeadRow(lead: any) {
  const score = lead.total_score || 0;
  const scoreClass = score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold';
  const statusClass = `status-${lead.status}`;
  
  return `
    <tr data-id="${lead.id}">
      <td><input type="checkbox" class="lead-checkbox" value="${lead.id}"></td>
      <td>
        <div class="lead-cell">
          <div class="lead-avatar">${(lead.first_name?.[0] || lead.email[0]).toUpperCase()}</div>
          <div class="lead-details">
            <span class="lead-name">${lead.first_name || ''} ${lead.last_name || ''}</span>
            <span class="lead-email">${lead.email}</span>
          </div>
        </div>
      </td>
      <td>${lead.company_name || lead.organization_name || '<span class="text-muted">Unknown</span>'}</td>
      <td><span class="source-badge">${lead.source}</span></td>
      <td><span class="status-badge ${statusClass}">${lead.status}</span></td>
      <td>
        <div class="score-cell">
          <span class="lead-score ${scoreClass}">${score}</span>
          <div class="score-bar">
            <div class="score-fill ${scoreClass}" style="width: ${score}%"></div>
          </div>
        </div>
      </td>
      <td>${new Date(lead.created_at).toLocaleDateString()}</td>
      <td>
        <div class="action-buttons">
          <button class="icon-btn small" onclick="viewLead('${lead.id}')" title="View">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="icon-btn small" onclick="enrichLead('${lead.id}')" title="Enrich">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>
          <button class="icon-btn small danger" onclick="deleteLead('${lead.id}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function initLeadsTable() {
  // Add any table-specific initialization
  document.getElementById('select-all')?.addEventListener('change', toggleSelectAll);
}

function toggleSelectAll() {
  const selectAll = document.getElementById('select-all') as HTMLInputElement;
  const checkboxes = document.querySelectorAll('.lead-checkbox');
  checkboxes.forEach(cb => {
    (cb as HTMLInputElement).checked = selectAll.checked;
  });
}

function getSelectedLeads(): string[] {
  const checkboxes = document.querySelectorAll('.lead-checkbox:checked');
  return Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value);
}

async function filterLeads() {
  const status = (document.getElementById('filter-status') as HTMLSelectElement).value;
  const source = (document.getElementById('filter-source') as HTMLSelectElement).value;
  const score = (document.getElementById('filter-score') as HTMLSelectElement).value;
  
  let query = '/api/v1/leads?';
  if (status) query += `status=${status}&`;
  if (source) query += `source=${source}&`;
  if (score) {
    if (score === 'hot') query += 'min_score=80&';
    if (score === 'warm') query += 'min_score=50&max_score=79&';
    if (score === 'cold') query += 'max_score=49&';
  }
  
  try {
    const response = await fetchAPI(query);
    state.leads = response.data;
    
    const tbody = document.getElementById('leads-tbody');
    if (tbody) {
      tbody.innerHTML = response.data.map((lead: any) => renderLeadRow(lead)).join('');
    }
  } catch (error) {
    console.error('Filter error:', error);
  }
}

async function changePage(page: number) {
  state.pagination.page = page;
  const query = `/api/v1/leads?page=${page}&limit=${state.pagination.limit}`;
  
  try {
    const response = await fetchAPI(query);
    state.leads = response.data;
    
    const tbody = document.getElementById('leads-tbody');
    if (tbody) {
      tbody.innerHTML = response.data.map((lead: any) => renderLeadRow(lead)).join('');
    }
  } catch (error) {
    console.error('Page change error:', error);
  }
}

function viewLead(leadId: string) {
  const lead = state.leads.find((l: any) => l.id === leadId);
  if (lead) {
    alert(`Lead Details:\n\nName: ${lead.first_name || ''} ${lead.last_name || ''}\nEmail: ${lead.email}\nCompany: ${lead.company_name || 'Unknown'}\nScore: ${lead.total_score || 0}`);
  }
}

async function enrichLead(leadId: string) {
  try {
    await fetchAPI(`/api/v1/leads/${leadId}/enrich`, { method: 'POST' });
    alert('Lead enrichment started');
    loadLeads(); // Refresh
  } catch (error) {
    alert(`Enrichment failed: ${error.message}`);
  }
}

async function deleteLead(leadId: string) {
  if (!confirm('Are you sure you want to delete this lead?')) return;
  
  try {
    await fetchAPI(`/api/v1/leads/${leadId}`, { method: 'DELETE' });
    alert('Lead deleted');
    loadLeads(); // Refresh
  } catch (error) {
    alert(`Delete failed: ${error.message}`);
  }
}

async function bulkEnrich() {
  const selected = getSelectedLeads();
  if (selected.length === 0) {
    alert('Please select leads to enrich');
    return;
  }
  
  try {
    const response = await fetchAPI('/api/v1/leads/bulk/enrich', {
      method: 'POST',
      body: JSON.stringify({ lead_ids: selected }),
    });
    
    alert(`Enrichment completed: ${response.processed} leads processed`);
    loadLeads(); // Refresh
  } catch (error) {
    alert(`Bulk enrichment failed: ${error.message}`);
  }
}

async function exportLeads() {
  try {
    const response = await fetchAPI('/api/v1/leads?limit=1000');
    const csv = convertToCSV(response.data);
    downloadCSV(csv, 'leads-export.csv');
  } catch (error) {
    alert(`Export failed: ${error.message}`);
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = ['Email', 'First Name', 'Last Name', 'Company', 'Source', 'Status', 'Score', 'Created'];
  const rows = data.map(lead => [
    lead.email,
    lead.first_name || '',
    lead.last_name || '',
    lead.company_name || '',
    lead.source,
    lead.status,
    lead.total_score || 0,
    new Date(lead.created_at).toISOString(),
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Make functions available globally
window.loadLeads = loadLeads;
window.filterLeads = filterLeads;
window.changePage = changePage;
window.viewLead = viewLead;
window.enrichLead = enrichLead;
window.deleteLead = deleteLead;
window.bulkEnrich = bulkEnrich;
window.exportLeads = exportLeads;
window.toggleSelectAll = toggleSelectAll;
window.getSelectedLeads = getSelectedLeads;
