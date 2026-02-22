// Brand Settings Section Component - Brand Configuration (Admin Only)
import { supabase } from "../../supabaseClient.js";
import { esc, showToast } from "../../utils.js";
import { getBrandColor, getBrandTheme } from "../../config.js";

const BRANDS = [
  { id: 'academy', name: 'Archer Academy', icon: '🎓' },
  { id: 'invest', name: 'Archer Invest', icon: '📈' },
  { id: 'fund', name: 'Archer Investment Fund', icon: '💼' }
];

export function renderBrandSettingsSection(user) {
  return `
    <div class="brand-settings-section">
      <div class="section-header">
        <h2 class="section-title">Brand Settings</h2>
        <p class="section-description">Beheer de visuele uitstraling en contactgegevens per merk</p>
      </div>

      <!-- Brand Tabs -->
      <div class="brand-tabs">
        ${BRANDS.map(brand => `
          <button 
            class="brand-tab ${brand.id === 'academy' ? 'active' : ''}" 
            data-brand="${esc(brand.id)}"
          >
            <span class="brand-tab-icon">${brand.icon}</span>
            <span class="brand-tab-name">${esc(brand.name)}</span>
          </button>
        `).join('')}
      </div>

      <!-- Brand Content -->
      <div class="brand-content" id="brand-content">
        <!-- Content will be loaded here -->
        <div class="loading-state">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  `;
}

export async function initializeBrandSettingsSection(user) {
  const tabsContainer = document.querySelector('.brand-tabs');
  const contentContainer = document.getElementById('brand-content');
  
  if (!tabsContainer || !contentContainer) return;

  let currentBrand = 'academy';
  let brandData = {};

  // Handle tab switching
  const tabs = tabsContainer.querySelectorAll('.brand-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', async (e) => {
      const brandId = e.currentTarget.dataset.brand;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      currentBrand = brandId;
      await loadBrandContent(brandId, contentContainer);
    });
  });

  // Load initial content
  await loadBrandContent(currentBrand, contentContainer);

  async function loadBrandContent(brandId, container) {
    // Show loading
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div class="loading-text">Brand gegevens laden...</div>
      </div>
    `;

    try {
      // Fetch brand settings
      const { data, error } = await supabase
        .from('brand_settings')
        .select('*')
        .eq('brand', brandId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      brandData = data || {
        brand: brandId,
        brand_name: BRANDS.find(b => b.id === brandId)?.name || '',
        accent_color: getBrandColor(brandId),
        logo_url: '',
        logo_wordmark_url: '',
        email_contact: 'events@archer.finance',
        is_active: true
      };

      renderBrandForm(brandData, container);
      
    } catch (error) {
      console.error('Error loading brand settings:', error);
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-message">Kon brand gegevens niet laden.</div>
        </div>
      `;
    }
  }

  function renderBrandForm(brand, container) {
    container.innerHTML = `
      <form class="brand-form" id="brand-form">
        <input type="hidden" name="brand" value="${esc(brand.brand)}">
        
        <div class="form-grid">
          <!-- Basic Information -->
          <div class="form-section">
            <h3 class="form-section-title">Basisinformatie</h3>
            
            <div class="form-group">
              <label for="brand-name" class="form-label">Brand naam</label>
              <input 
                type="text" 
                id="brand-name" 
                name="brand_name" 
                class="form-input"
                value="${esc(brand.brand_name || '')}"
                required
              >
            </div>

            <div class="form-group">
              <label for="email-contact" class="form-label">Contact e-mail</label>
              <input 
                type="email" 
                id="email-contact" 
                name="email_contact" 
                class="form-input"
                value="${esc(brand.email_contact || '')}"
                placeholder="events@archer.finance"
                required
              >
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  name="is_active" 
                  ${brand.is_active ? 'checked' : ''}
                >
                Brand actief
              </label>
            </div>
          </div>

          <!-- Visual Settings -->
          <div class="form-section">
            <h3 class="form-section-title">Visuele instellingen</h3>
            
            <div class="form-group">
              <label for="accent-color" class="form-label">Accent kleur</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  id="accent-color-preview" 
                  class="color-preview"
                  value="${esc(brand.accent_color || '#4d73ff')}"
                >
                <input 
                  type="text" 
                  id="accent-color" 
                  name="accent_color" 
                  class="form-input color-input"
                  value="${esc(brand.accent_color || '')}"
                  placeholder="#4d73ff"
                  pattern="^#[0-9A-Fa-f]{6}$"
                >
                <button type="button" class="btn-ghost color-reset" id="color-reset-btn">
                  ↺ Standaard
                </button>
              </div>
              <small class="form-help">Voer een hex kleurcode in (bijv. #4d73ff)</small>
            </div>

            <div class="form-group">
              <label for="logo-url" class="form-label">Logo URL</label>
              <input 
                type="url" 
                id="logo-url" 
                name="logo_url" 
                class="form-input"
                value="${esc(brand.logo_url || '')}"
                placeholder="https://example.com/logo.png"
              >
            </div>

            <div class="form-group">
              <label for="logo-wordmark-url" class="form-label">Logo wordmark URL</label>
              <input 
                type="url" 
                id="logo-wordmark-url" 
                name="logo_wordmark_url" 
                class="form-input"
                value="${esc(brand.logo_wordmark_url || '')}"
                placeholder="https://example.com/wordmark.png"
              >
            </div>
          </div>

          <!-- Preview Section -->
          <div class="form-section">
            <h3 class="form-section-title">Live preview</h3>
            <div class="brand-preview" id="brand-preview">
              <div class="preview-header" style="background-color: ${esc(brand.accent_color || '#4d73ff')}">
                ${brand.logo_url 
                  ? `<img src="${esc(brand.logo_url)}" alt="Logo" class="preview-logo">`
                  : `<div class="preview-logo-placeholder">${esc(brand.brand_name?.charAt(0) || 'A')}</div>`
                }
                <div class="preview-title">${esc(brand.brand_name || 'Brand Naam')}</div>
              </div>
              <div class="preview-details">
                <div class="preview-contact">
                  <strong>Contact:</strong> ${esc(brand.email_contact || 'events@archer.finance')}
                </div>
                <div class="preview-status">
                  <strong>Status:</strong> 
                  <span class="status-badge ${brand.is_active ? 'active' : 'inactive'}">
                    ${brand.is_active ? 'Actief' : 'Inactief'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary" id="save-brand-btn">
            💾 Brand opslaan
          </button>
          <button type="button" class="btn-secondary" id="cancel-brand-btn">
            Annuleren
          </button>
        </div>
      </form>
    `;

    initializeBrandForm(brand);
  }

  function initializeBrandForm(brand) {
    const form = document.getElementById('brand-form');
    const saveBtn = document.getElementById('save-brand-btn');
    const cancelBtn = document.getElementById('cancel-brand-btn');
    const colorInput = document.getElementById('accent-color');
    const colorPreview = document.getElementById('accent-color-preview');
    const colorResetBtn = document.getElementById('color-reset-btn');
    const preview = document.getElementById('brand-preview');

    if (!form) return;

    // Sync color inputs
    if (colorInput && colorPreview) {
      colorInput.addEventListener('input', (e) => {
        colorPreview.value = e.target.value;
        updatePreview();
      });

      colorPreview.addEventListener('input', (e) => {
        colorInput.value = e.target.value;
        updatePreview();
      });
    }

    // Reset color to default
    if (colorResetBtn) {
      colorResetBtn.addEventListener('click', () => {
        const defaultColor = getBrandColor(brand.brand);
        if (colorInput) colorInput.value = defaultColor;
        if (colorPreview) colorPreview.value = defaultColor;
        updatePreview();
      });
    }

    // Update preview
    function updatePreview() {
      if (!preview) return;
      
      const header = preview.querySelector('.preview-header');
      const currentColor = colorInput?.value || brand.accent_color;
      if (header) {
        header.style.backgroundColor = currentColor;
      }
    }

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
          brand_name: formData.get('brand_name'),
          accent_color: formData.get('accent_color'),
          logo_url: formData.get('logo_url'),
          logo_wordmark_url: formData.get('logo_wordmark_url'),
          email_contact: formData.get('email_contact'),
          is_active: formData.get('is_active') === 'on'
        };

        const { error } = await supabase
          .from('brand_settings')
          .upsert(updates, { onConflict: 'brand' });

        if (error) throw error;

        showToast(`Brand "${updates.brand_name}" succesvol opgeslagen!`, 'success');
        
        // Update brand data
        Object.assign(brand, updates);
        
      } catch (error) {
        console.error('Error updating brand:', error);
        showToast('Er is een fout opgetreden bij het opslaan van de brand instellingen.', 'error');
      } finally {
        // Restore button state
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }
    });

    // Handle cancel
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        renderBrandForm(brand, contentContainer);
      });
    }
  }
}
