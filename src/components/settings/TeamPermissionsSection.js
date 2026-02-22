// Team & Permissions Section Component - User Management (Admin Only)
import { supabase } from "../../supabaseClient.js";
import { esc, showToast } from "../../utils.js";
import { listAuditLog } from "../../store.js";

const ROLES = [
  { value: 'admin', label: 'Administrator', color: '#dc2626' },
  { value: 'operations', label: 'Operations', color: '#2563eb' },
  { value: 'viewer', label: 'Viewer', color: '#6b7280' }
];

const BRANDS = [
  { id: 'academy', name: 'Archer Academy', color: '#4d73ff' },
  { id: 'invest', name: 'Archer Invest', color: '#2d50ef' },
  { id: 'fund', name: 'Archer Investment Fund', color: '#1032cf' }
];

export function renderTeamPermissionsSection(user) {
  return `
    <div class="team-section">
      <div class="section-header">
        <h2 class="section-title">Team & Rechten</h2>
        <p class="section-description">Beheer gebruikers, rollen en brand toegang</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number" id="total-users">-</div>
          <div class="stat-label">Totaal gebruikers</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="active-users">-</div>
          <div class="stat-label">Actieve gebruikers</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="admin-users">-</div>
          <div class="stat-label">Administrators</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="recent-activity">-</div>
          <div class="stat-label">Recente activiteit</div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="team-filters">
        <div class="filter-group">
          <input 
            type="text" 
            id="user-search" 
            class="search-input"
            placeholder="🔍 Zoek gebruikers..."
          >
        </div>
        
        <div class="filter-group">
          <select id="role-filter" class="filter-select">
            <option value="">Alle rollen</option>
            ${ROLES.map(role => `
              <option value="${esc(role.value)}">${esc(role.label)}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <select id="brand-filter" class="filter-select">
            <option value="">Alle brands</option>
            ${BRANDS.map(brand => `
              <option value="${esc(brand.id)}">${esc(brand.name)}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <select id="status-filter" class="filter-select">
            <option value="">Alle statussen</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>
        </div>

        <button class="btn-primary" id="add-user-btn">
          + Nieuwe gebruiker
        </button>
      </div>

      <!-- Users Table -->
      <div class="users-table-container">
        <div class="loading-state" id="users-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Gebruikers laden...</div>
        </div>
        
        <div class="users-table-wrapper" id="users-table-wrapper" style="display: none;">
          <table class="users-table" id="users-table">
            <thead>
              <tr>
                <th>Gebruiker</th>
                <th>Rol</th>
                <th>Brand toegang</th>
                <th>Status</th>
                <th>Laatst actief</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody id="users-tbody">
              <!-- Users will be populated here -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" id="users-pagination" style="display: none;">
        <button class="btn-ghost" id="prev-page" disabled>← Vorige</button>
        <span class="page-info" id="page-info">Pagina 1 van 1</span>
        <button class="btn-ghost" id="next-page" disabled>Volgende →</button>
      </div>
    </div>
  `;
}

export async function initializeTeamPermissionsSection(user) {
  let users = [];
  let filteredUsers = [];
  let currentPage = 1;
  const usersPerPage = 10;

  // Load initial data
  await loadUsers();
  await loadStats();

  // Setup event listeners
  setupEventListeners();

  async function loadUsers() {
    const loadingEl = document.getElementById('users-loading');
    const tableWrapper = document.getElementById('users-table-wrapper');
    
    try {
      loadingEl.style.display = 'block';
      tableWrapper.style.display = 'none';

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      users = data || [];
      filteredUsers = [...users];
      
      renderUsersTable();
      updatePagination();
      
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Er is een fout opgetreden bij het laden van gebruikers.', 'error');
    } finally {
      loadingEl.style.display = 'none';
      tableWrapper.style.display = 'block';
    }
  }

  async function loadStats() {
    try {
      // User counts
      document.getElementById('total-users').textContent = users.length;
      document.getElementById('active-users').textContent = users.filter(u => u.is_active).length;
      document.getElementById('admin-users').textContent = users.filter(u => u.role === 'admin').length;

      // Recent activity
      const recentLogs = await listAuditLog(10);
      document.getElementById('recent-activity').textContent = recentLogs.length;
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    // Filters
    const roleFilter = document.getElementById('role-filter');
    const brandFilter = document.getElementById('brand-filter');
    const statusFilter = document.getElementById('status-filter');
    
    [roleFilter, brandFilter, statusFilter].forEach(filter => {
      if (filter) filter.addEventListener('change', applyFilters);
    });

    // Add user button
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => {
        showToast('Gebruiker toevoegen functionaliteit wordt binnenkort toegevoegd.', 'info');
      });
    }

    // Pagination
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderUsersTable();
        updatePagination();
      }
    });
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderUsersTable();
        updatePagination();
      }
    });
  }

  function applyFilters() {
    const searchTerm = document.getElementById('user-search')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('role-filter')?.value || '';
    const brandFilter = document.getElementById('brand-filter')?.value || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';

    filteredUsers = users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm);
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesBrand = !brandFilter || user.brand_access?.includes(brandFilter);
      const matchesStatus = !statusFilter || 
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesBrand && matchesStatus;
    });

    currentPage = 1;
    renderUsersTable();
    updatePagination();
  }

  function renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    tbody.innerHTML = pageUsers.map(user => `
      <tr class="user-row" data-user-id="${esc(user.id)}">
        <td>
          <div class="user-cell">
            <div class="user-avatar">
              ${user.avatar_url 
                ? `<img src="${esc(user.avatar_url)}" alt="${esc(user.full_name)}" class="avatar-small">`
                : `<div class="avatar-placeholder-small">${esc(user.full_name?.charAt(0) || 'U')}</div>`
              }
            </div>
            <div class="user-info">
              <div class="user-name">${esc(user.full_name || 'Onbekend')}</div>
              <div class="user-email">${esc(user.email || '')}</div>
            </div>
          </div>
        </td>
        <td>
          <select class="role-select" data-user-id="${esc(user.id)}" data-original-role="${esc(user.role)}">
            ${ROLES.map(role => `
              <option value="${esc(role.value)}" ${user.role === role.value ? 'selected' : ''}>
                ${esc(role.label)}
              </option>
            `).join('')}
          </select>
        </td>
        <td>
          <div class="brand-access-list">
            ${BRANDS.map(brand => `
              <label class="brand-checkbox">
                <input 
                  type="checkbox" 
                  data-user-id="${esc(user.id)}" 
                  data-brand="${esc(brand.id)}"
                  ${user.brand_access?.includes(brand.id) ? 'checked' : ''}
                >
                <span class="brand-indicator" style="background-color: ${esc(brand.color)}">
                  ${esc(brand.name.charAt(0))}
                </span>
                ${esc(brand.name)}
              </label>
            `).join('')}
          </div>
        </td>
        <td>
          <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
            ${user.is_active ? 'Actief' : 'Inactief'}
          </span>
        </td>
        <td>
          <div class="last-active">
            ${user.last_sign_in_at 
              ? formatDate(user.last_sign_in_at)
              : '<span class="never-active">Nooit</span>'
            }
          </div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-ghost btn-small save-user-btn" data-user-id="${esc(user.id)}">
              💾
            </button>
            <button class="btn-ghost btn-small toggle-user-btn" data-user-id="${esc(user.id)}" data-active="${user.is_active}">
              ${user.is_active ? '🔒' : '🔓'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Setup row-specific event listeners
    setupRowEventListeners();
  }

  function setupRowEventListeners() {
    // Role changes
    document.querySelectorAll('.role-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const userId = e.target.dataset.userId;
        const newRole = e.target.value;
        const originalRole = e.target.dataset.originalRole;
        
        if (newRole !== originalRole) {
          e.target.style.borderColor = '#2563eb';
          e.target.title = 'Klik op opslaan om wijziging toe te passen';
        }
      });
    });

    // Brand access changes
    document.querySelectorAll('.brand-checkbox input').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const userId = e.target.dataset.userId;
        const row = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (row) {
          const saveBtn = row.querySelector('.save-user-btn');
          if (saveBtn) {
            saveBtn.style.backgroundColor = '#2563eb';
            saveBtn.textContent = '💾 Wijzigingen opslaan';
          }
        }
      });
    });

    // Save buttons
    document.querySelectorAll('.save-user-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = e.target.dataset.userId;
        await saveUserChanges(userId);
      });
    });

    // Toggle status buttons
    document.querySelectorAll('.toggle-user-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = e.target.dataset.userId;
        const newStatus = e.target.dataset.active === 'true' ? false : true;
        await toggleUserStatus(userId, newStatus);
      });
    });
  }

  async function saveUserChanges(userId) {
    try {
      const row = document.querySelector(`tr[data-user-id="${userId}"]`);
      const roleSelect = row.querySelector('.role-select');
      const brandCheckboxes = row.querySelectorAll('.brand-checkbox input');
      
      const newRole = roleSelect.value;
      const newBrandAccess = Array.from(brandCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.brand);

      const { error } = await supabase
        .from('profiles')
        .update({
          role: newRole,
          brand_access: newBrandAccess
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local data
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].role = newRole;
        users[userIndex].brand_access = newBrandAccess;
      }

      // Reset UI
      roleSelect.style.borderColor = '';
      roleSelect.title = '';
      roleSelect.dataset.originalRole = newRole;
      
      const saveBtn = row.querySelector('.save-user-btn');
      if (saveBtn) {
        saveBtn.style.backgroundColor = '';
        saveBtn.textContent = '💾';
      }

      showToast('Gebruiker succesvol bijgewerkt!', 'success');
      
    } catch (error) {
      console.error('Error saving user changes:', error);
      showToast('Er is een fout opgetreden bij het opslaan van wijzigingen.', 'error');
    }
  }

  async function toggleUserStatus(userId, newStatus) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Update local data
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].is_active = newStatus;
      }

      // Re-render table
      applyFilters();
      
      showToast(`Gebruiker succesvol ${newStatus ? 'geactiveerd' : 'gedeactiveerd'}!`, 'success');
      
    } catch (error) {
      console.error('Error toggling user status:', error);
      showToast('Er is een fout opgetreden bij het wijzigen van de gebruikersstatus.', 'error');
    }
  }

  function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const pagination = document.getElementById('users-pagination');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

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

  function formatDate(dateString) {
    if (!dateString) return 'Nooit';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Vandaag';
    if (diffDays === 1) return 'Gisteren';
    if (diffDays < 7) return `${diffDays} dagen geleden`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weken geleden`;
    
    return date.toLocaleDateString('nl-BE');
  }
}
