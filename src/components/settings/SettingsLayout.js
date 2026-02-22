// Settings Layout Component - Main Control Center Dashboard
import { supabase } from "../../supabaseClient.js";
import { esc, showToast } from "../../utils.js";
import { getBrandColor, getBrandTheme, computeBrandCssVariables } from "../../config.js";

export function renderSettingsLayout(user, activeSection = 'profile') {
  const isAdmin = user?.role === 'admin';
  
  const navigationItems = [
    { 
      id: 'profile', 
      icon: '👤', 
      label: 'Mijn Profiel', 
      description: 'Beheer je persoonlijke gegevens',
      visible: true 
    },
    { 
      id: 'brands', 
      icon: '🎨', 
      label: 'Brand Settings', 
      description: 'Beheer merkuitstraling en kleuren',
      visible: isAdmin 
    },
    { 
      id: 'team', 
      icon: '👥', 
      label: 'Team & Rechten', 
      description: 'Gebruikersbeheer en toegangsrechten',
      visible: isAdmin 
    },
    { 
      id: 'audit', 
      icon: '📋', 
      label: 'Audit Logs', 
      description: 'Systeemactiviteiten en wijzigingen',
      visible: isAdmin 
    }
  ].filter(item => item.visible);

  return `
    <div class="settings-layout">
      <!-- Sidebar Navigation -->
      <aside class="settings-sidebar">
        <div class="settings-sidebar-header">
          <div class="user-avatar">
            ${user?.avatar_url 
              ? `<img src="${esc(user.avatar_url)}" alt="${esc(user.full_name)}" class="avatar-img">`
              : `<div class="avatar-placeholder">${esc(user.full_name?.charAt(0) || 'U'}</div>`
            }
          </div>
          <div class="user-info">
            <div class="user-name">${esc(user.full_name || 'Gebruiker')}</div>
            <div class="user-role">${esc(user.role || 'viewer')}</div>
          </div>
        </div>
        
        <nav class="settings-nav">
          ${navigationItems.map(item => `
            <button 
              class="settings-nav-item ${activeSection === item.id ? 'active' : ''}"
              data-section="${esc(item.id)}"
              title="${esc(item.description)}"
            >
              <span class="nav-icon">${item.icon}</span>
              <span class="nav-label">${item.label}</span>
            </button>
          `).join('')}
        </nav>
        
        <div class="settings-sidebar-footer">
          <button class="btn-ghost back-to-dashboard" data-page="Dashboard">
            ← Terug naar Dashboard
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="settings-main">
        <div class="settings-content" id="settings-content">
          <!-- Content will be rendered here -->
        </div>
      </main>
    </div>
  `;
}

export function initializeSettingsLayout(user) {
  const settingsContent = document.getElementById('settings-content');
  if (!settingsContent) return;

  // Handle navigation clicks
  const navItems = settingsContent.closest('.settings-layout').querySelectorAll('.settings-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const section = e.currentTarget.dataset.section;
      
      // Update active state
      navItems.forEach(nav => nav.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      // Load section content
      loadSettingsSection(section, user);
    });
  });

  // Handle back to dashboard
  const backBtn = settingsContent.closest('.settings-layout').querySelector('.back-to-dashboard');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.hash = '#dashboard';
    });
  }

  // Load initial section
  const hash = window.location.hash.substring(1);
  const initialSection = hash && ['profile', 'brands', 'team', 'audit'].includes(hash) ? hash : 'profile';
  loadSettingsSection(initialSection, user);
}

async function loadSettingsSection(section, user) {
  const contentEl = document.getElementById('settings-content');
  if (!contentEl) return;

  // Show loading state
  contentEl.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">Bezig met laden...</div>
    </div>
  `;

  try {
    let content;
    switch (section) {
      case 'profile':
        const { renderProfileSection } = await import('./ProfileSection.js');
        content = renderProfileSection(user);
        break;
      case 'brands':
        const { renderBrandSettingsSection } = await import('./BrandSettingsSection.js');
        content = renderBrandSettingsSection(user);
        break;
      case 'team':
        const { renderTeamPermissionsSection } = await import('./TeamPermissionsSection.js');
        content = renderTeamPermissionsSection(user);
        break;
      case 'audit':
        const { renderAuditLogSection } = await import('./AuditLogSection.js');
        content = renderAuditLogSection(user);
        break;
      default:
        content = '<div class="error-state">Sectie niet gevonden</div>';
    }

    contentEl.innerHTML = content;
    
    // Initialize section-specific functionality
    switch (section) {
      case 'profile':
        const { initializeProfileSection } = await import('./ProfileSection.js');
        initializeProfileSection(user);
        break;
      case 'brands':
        const { initializeBrandSettingsSection } = await import('./BrandSettingsSection.js');
        initializeBrandSettingsSection(user);
        break;
      case 'team':
        const { initializeTeamPermissionsSection } = await import('./TeamPermissionsSection.js');
        initializeTeamPermissionsSection(user);
        break;
      case 'audit':
        const { initializeAuditLogSection } = await import('./AuditLogSection.js');
        initializeAuditLogSection(user);
        break;
    }

    // Update URL hash
    window.location.hash = `#${section}`;
    
  } catch (error) {
    console.error('Error loading settings section:', error);
    contentEl.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">Er is een fout opgetreden bij het laden van deze sectie.</div>
        <button class="btn-primary" onclick="location.reload()">Opnieuw proberen</button>
      </div>
    `;
  }
}
