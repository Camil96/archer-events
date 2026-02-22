// Profile Section Component - User Profile Management
import { supabase } from "../../supabaseClient.js";
import { esc, showToast } from "../../utils.js";

export function renderProfileSection(user) {
  return `
    <div class="profile-section">
      <div class="section-header">
        <h2 class="section-title">Mijn Profiel</h2>
        <p class="section-description">Beheer je persoonlijke gegevens en voorkeuren</p>
      </div>

      <div class="profile-content">
        <!-- Avatar Section -->
        <div class="profile-avatar-section">
          <div class="avatar-container">
            ${user?.avatar_url 
              ? `<img src="${esc(user.avatar_url)}" alt="${esc(user.full_name)}" class="profile-avatar-large">`
              : `<div class="profile-avatar-placeholder">${esc(user.full_name?.charAt(0) || 'U'}</div>`
            }
            <button class="btn-ghost avatar-upload-btn" id="avatar-upload-btn">
              📷 Wijzig foto
            </button>
          </div>
        </div>

        <!-- Profile Form -->
        <form class="profile-form" id="profile-form">
          <div class="form-grid">
            <!-- Basic Information -->
            <div class="form-section">
              <h3 class="form-section-title">Basisinformatie</h3>
              
              <div class="form-group">
                <label for="full-name" class="form-label">Volledige naam</label>
                <input 
                  type="text" 
                  id="full-name" 
                  name="full_name" 
                  class="form-input"
                  value="${esc(user?.full_name || '')}"
                  required
                >
              </div>

              <div class="form-group">
                <label for="email" class="form-label">E-mailadres</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  class="form-input"
                  value="${esc(user?.email || '')}"
                  readonly
                  disabled
                >
                <small class="form-help">E-mail kan niet worden gewijzigd. Neem contact op met een admin.</small>
              </div>
            </div>

            <!-- Role Information (Read-only) -->
            <div class="form-section">
              <h3 class="form-section-title">Rol & Toegang</h3>
              
              <div class="form-group">
                <label class="form-label">Huidige rol</label>
                <div class="role-display">
                  <span class="role-badge role-${esc(user?.role || 'viewer')}">
                    ${getRoleLabel(user?.role)}
                  </span>
                </div>
                <small class="form-help">Je rol wordt beheerd door een administrator.</small>
              </div>

              <div class="form-group">
                <label class="form-label">Brand toegang</label>
                <div class="brand-access-display">
                  ${user?.brand_access && user.brand_access.length > 0 
                    ? user.brand_access.map(brand => `
                      <span class="brand-badge brand-${esc(brand)}">
                        ${getBrandLabel(brand)}
                      </span>
                    `).join('')
                    : '<span class="no-access">Geen brand toegang</span>'
                  }
                </div>
                <small class="form-help">Brand toegang wordt beheerd door een administrator.</small>
              </div>
            </div>

            <!-- Preferences -->
            <div class="form-section">
              <h3 class="form-section-title">Voorkeuren</h3>
              
              <div class="form-group">
                <label for="language" class="form-label">Taal</label>
                <select id="language" name="language" class="form-select">
                  <option value="nl" ${user?.preferences?.language === 'nl' ? 'selected' : ''}>Nederlands</option>
                  <option value="en" ${user?.preferences?.language === 'en' ? 'selected' : ''}>English</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Notificaties</label>
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      name="email_notifications" 
                      ${user?.preferences?.email_notifications !== false ? 'checked' : ''}
                    >
                    E-mail notificaties ontvangen
                  </label>
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      name="browser_notifications" 
                      ${user?.preferences?.browser_notifications !== false ? 'checked' : ''}
                    >
                    Browser notificaties ontvangen
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" id="save-profile-btn">
              💾 Profiel opslaan
            </button>
            <button type="button" class="btn-secondary" id="cancel-profile-btn">
              Annuleren
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function initializeProfileSection(user) {
  const form = document.getElementById('profile-form');
  const saveBtn = document.getElementById('save-profile-btn');
  const cancelBtn = document.getElementById('cancel-profile-btn');
  const avatarBtn = document.getElementById('avatar-upload-btn');

  if (!form) return;

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!saveBtn) return;
    
    // Show loading state
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '⏳ Bezig met opslaan...';
    saveBtn.disabled = true;

    try {
      const formData = new FormData(form);
      const updates = {
        full_name: formData.get('full_name'),
        preferences: {
          language: formData.get('language'),
          email_notifications: formData.get('email_notifications') === 'on',
          browser_notifications: formData.get('browser_notifications') === 'on'
        }
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      showToast('Profiel succesvol opgeslagen!', 'success');
      
      // Update user data in memory
      Object.assign(user, updates);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Er is een fout opgetreden bij het opslaan van je profiel.', 'error');
    } finally {
      // Restore button state
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  });

  // Handle cancel
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      // Reset form to original values
      form.reset();
      // Re-populate with original user data
      const nameInput = form.querySelector('#full-name');
      if (nameInput) nameInput.value = user?.full_name || '';
    });
  }

  // Handle avatar upload
  if (avatarBtn) {
    avatarBtn.addEventListener('click', () => {
      showToast('Avatar upload functionaliteit wordt binnenkort toegevoegd.', 'info');
    });
  }
}

function getRoleLabel(role) {
  const roleLabels = {
    'admin': 'Administrator',
    'operations': 'Operations',
    'viewer': 'Viewer'
  };
  return roleLabels[role] || 'Onbekend';
}

function getBrandLabel(brand) {
  const brandLabels = {
    'academy': 'Archer Academy',
    'invest': 'Archer Invest',
    'fund': 'Archer Investment Fund'
  };
  return brandLabels[brand] || brand;
}
