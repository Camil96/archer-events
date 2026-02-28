// Audit Section Component - System Activity Logging (Admin Only)
import { supabase } from "../../supabaseClient.js";
import { esc, showToast } from "../../utils.js";
import { listAuditLog } from "../../store.js";

const ACTIONS = [
  { value: 'create', label: 'Aangemaakt', icon: '➕', color: '#10b981' },
  { value: 'update', label: 'Bijgewerkt', icon: '✏️', color: '#3b82f6' },
  { value: 'delete', label: 'Verwijderd', icon: '🗑️', color: '#ef4444' },
  { value: 'login', label: 'Login', icon: '🔓', color: '#10b981' },
  { value: 'logout', label: 'Logout', icon: '🔒', color: '#f59e0b' }
];

const RESOURCES = [
  'profiles', 'brand_settings', 'events', 'tasks', 'participants'
];

export function renderAuditSection(user) {
  return `
    <div class="audit-section">
      <div class="section-header">
        <h2 class="section-title">Audit Logs</h2>
        <p class="section-description">Bekijk recente systeemactiviteiten en wijzigingen</p>
      </div>

      <!-- Filters -->
      <div class="audit-filters">
        <div class="filter-group">
          <input 
            type="text" 
            id="audit-search" 
            class="search-input"
            placeholder="🔍 Zoek in audit logs..."
          >
        </div>
        
        <div class="filter-group">
          <select id="action-filter" class="filter-select">
            <option value="">Alle acties</option>
            ${ACTIONS.map(action => `
              <option value="${esc(action.value)}">${action.icon} ${esc(action.label)}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <select id="resource-filter" class="filter-select">
            <option value="">Alle resources</option>
            ${RESOURCES.map(resource => `
              <option value="${esc(resource)}">${esc(resource)}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <select id="date-filter" class="filter-select">
            <option value="">Alle periodes</option>
            <option value="1">Laatste 24 uur</option>
            <option value="7">Laatste 7 dagen</option>
            <option value="30">Laatste 30 dagen</option>
            <option value="90">Laatste 90 dagen</option>
          </select>
        </div>

        <button class="btn-secondary" id="export-audit-btn">
          📥 Export CSV
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="audit-stats">
        <div class="stat-card">
          <div class="stat-number" id="total-logs">-</div>
          <div class="stat-label">Totaal logs</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="today-logs">-</div>
          <div class="stat-label">Vandaag</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="week-logs">-</div>
          <div class="stat-label">Deze week</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="unique-users">-</div>
          <div class="stat-label">Unieke gebruikers</div>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="audit-table-container">
        <div class="loading-state" id="audit-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Audit logs laden...</div>
        </div>
        
        <div class="audit-table-wrapper" id="audit-table-wrapper" style="display: none;">
          <table class="audit-table" id="audit-table">
            <thead>
              <tr>
                <th>Tijd</th>
                <th>Gebruiker</th>
                <th>Actie</th>
                <th>Resource</th>
                <th>Details</th>
                <th>IP Adres</th>
              </tr>
            </thead>
            <tbody id="audit-tbody">
              <!-- Audit logs will be populated here -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" id="audit-pagination" style="display: none;">
        <button class="btn-ghost" id="audit-prev-page" disabled>← Vorige</button>
        <span class="page-info" id="audit-page-info">Pagina 1 van 1</span>
        <button class="btn-ghost" id="audit-next-page" disabled>Volgende →</button>
      </div>
    </div>
  `;
}

export async function initializeAuditSection(user) {
  let auditLogs = [];
  let filteredLogs = [];
  let currentPage = 1;
  const logsPerPage = 20;

  // Load initial data
  await loadAuditLogs();
  await loadStats();

  // Setup event listeners
  setupEventListeners();

  async function loadAuditLogs() {
    const loadingEl = document.getElementById('audit-loading');
    const tableWrapper = document.getElementById('audit-table-wrapper');
    
    try {
      loadingEl.style.display = 'block';
      tableWrapper.style.display = 'none';

      const logs = await listAuditLog(200); // Load more for filtering
      auditLogs = logs || [];
      filteredLogs = [...auditLogs];
      
      renderAuditTable();
      updatePagination();
      
    } catch (error) {
      console.error('Error loading audit logs:', error);
      showToast('Er is een fout opgetreden bij het laden van audit logs.', 'error');
    } finally {
      loadingEl.style.display = 'none';
      tableWrapper.style.display = 'block';
    }
  }

  async function loadStats() {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const todayLogs = auditLogs.filter(log => 
        log.created_at?.startsWith(today)
      );
      const weekLogs = auditLogs.filter(log => 
        log.created_at?.split('T')[0] >= weekAgo
      );
      const uniqueUsers = [...new Set(auditLogs.map(log => log.user_id).filter(Boolean))];

      document.getElementById('total-logs').textContent = auditLogs.length;
      document.getElementById('today-logs').textContent = todayLogs.length;
      document.getElementById('week-logs').textContent = weekLogs.length;
      document.getElementById('unique-users').textContent = uniqueUsers.length;
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('audit-search');
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    // Filters
    const actionFilter = document.getElementById('action-filter');
    const resourceFilter = document.getElementById('resource-filter');
    const dateFilter = document.getElementById('date-filter');
    
    [actionFilter, resourceFilter, dateFilter].forEach(filter => {
      if (filter) filter.addEventListener('change', applyFilters);
    });

    // Export button
    const exportBtn = document.getElementById('export-audit-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportAuditLogs);
    }

    // Pagination
    const prevBtn = document.getElementById('audit-prev-page');
    const nextBtn = document.getElementById('audit-next-page');
    
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderAuditTable();
        updatePagination();
      }
    });
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderAuditTable();
        updatePagination();
      }
    });
  }

  function applyFilters() {
    const searchTerm = document.getElementById('audit-search')?.value.toLowerCase() || '';
    const actionFilter = document.getElementById('action-filter')?.value || '';
    const resourceFilter = document.getElementById('resource-filter')?.value || '';
    const dateFilter = document.getElementById('date-filter')?.value || '';

    filteredLogs = auditLogs.filter(log => {
      // Search filter
      const matchesSearch = !searchTerm || 
        log.action?.toLowerCase().includes(searchTerm) ||
        log.resource_type?.toLowerCase().includes(searchTerm) ||
        log.user?.full_name?.toLowerCase().includes(searchTerm) ||
        log.user?.email?.toLowerCase().includes(searchTerm);
      
      // Action filter
      const matchesAction = !actionFilter || log.action === actionFilter;
      
      // Resource filter
      const matchesResource = !resourceFilter || log.resource_type === resourceFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter) {
        const logDate = new Date(log.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));
        
        matchesDate = daysDiff <= parseInt(dateFilter);
      }

      return matchesSearch && matchesAction && matchesResource && matchesDate;
    });

    currentPage = 1;
    renderAuditTable();
    updatePagination();
  }

  function renderAuditTable() {
    const tbody = document.getElementById('audit-tbody');
    if (!tbody) return;

    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const pageLogs = filteredLogs.slice(startIndex, endIndex);

    tbody.innerHTML = pageLogs.map(log => {
      const action = ACTIONS.find(a => a.value === log.action);
      const actionIcon = action?.icon || '📝';
      const actionColor = action?.color || '#6b7280';

      return `
        <tr class="audit-row">
          <td>
            <div class="timestamp">
              <div class="date">${formatDate(log.created_at)}</div>
              <div class="time">${formatTime(log.created_at)}</div>
            </div>
          </td>
          <td>
            <div class="user-cell">
              <div class="user-avatar">
                ${log.user?.avatar_url 
                  ? `<img src="${esc(log.user.avatar_url)}" alt="${esc(log.user.full_name)}" class="avatar-small">`
                  : `<div class="avatar-placeholder-small">${esc(log.user?.full_name?.charAt(0) || 'U')}</div>`
                }
              </div>
              <div class="user-info">
                <div class="user-name">${esc(log.user?.full_name || 'Systeem')}</div>
                <div class="user-email">${esc(log.user?.email || '')}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="action-badge" style="background-color: ${esc(actionColor)}20; color: ${esc(actionColor)};">
              ${actionIcon} ${getActionLabel(log.action)}
            </span>
          </td>
          <td>
            <div class="resource-info">
              <div class="resource-type">${esc(log.resource_type || '-')}</div>
              ${log.resource_id ? `<div class="resource-id">ID: ${esc(log.resource_id.slice(0, 8))}...</div>` : ''}
            </div>
          </td>
          <td>
            <div class="log-details">
              ${log.new_values ? renderValueChanges(log.old_values, log.new_values) : '-'}
            </div>
          </td>
          <td>
            <div class="ip-address">
              ${esc(log.ip_address || 'Onbekend')}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderValueChanges(oldValues, newValues) {
    if (!oldValues && !newValues) return '-';
    
    const changes = [];
    
    if (oldValues && newValues) {
      Object.keys(newValues).forEach(key => {
        if (oldValues[key] !== newValues[key]) {
          changes.push(`
            <div class="value-change">
              <span class="change-key">${esc(key)}:</span>
              <span class="change-old">${esc(String(oldValues[key] || '-'))}</span>
              →
              <span class="change-new">${esc(String(newValues[key] || '-'))}</span>
            </div>
          `);
        }
      });
    } else if (newValues) {
      Object.keys(newValues).forEach(key => {
        changes.push(`
          <div class="value-change">
            <span class="change-key">${esc(key)}:</span>
            <span class="change-new">${esc(String(newValues[key] || '-'))}</span>
          </div>
        `);
      });
    }

    return changes.slice(0, 3).join(''); // Show max 3 changes
  }

  function updatePagination() {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const pagination = document.getElementById('audit-pagination');
    const pageInfo = document.getElementById('audit-page-info');
    const prevBtn = document.getElementById('audit-prev-page');
    const nextBtn = document.getElementById('audit-next-page');

    if (pagination) {
      pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }

    if (pageInfo) {
      pageInfo.textContent = `Pagina ${currentPage} van ${totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage === totalPages;
    }
  }

  function exportAuditLogs() {
    try {
      const csv = [
        ['Tijd', 'Gebruiker', 'Actie', 'Resource', 'Details', 'IP Adres'],
        ...filteredLogs.map(log => [
          formatDateTime(log.created_at),
          log.user?.full_name || '',
          getActionLabel(log.action),
          log.resource_type || '',
          JSON.stringify(log.new_values || {}),
          log.ip_address || ''
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Audit logs succesvol geëxporteerd!', 'success');
      
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      showToast('Er is een fout opgetreden bij het exporteren van audit logs.', 'error');
    }
  }

  function getActionLabel(action) {
    const actionObj = ACTIONS.find(a => a.value === action);
    return actionObj?.label || action;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-BE');
  }

  function formatTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('nl-BE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('nl-BE');
  }
}
