import { supabase } from "./supabaseClient.js";
import {
  listEvents, createEvent, updateEvent, deleteEvent,
  listTasks, createTask, updateTask, deleteTask,
  listSubtasks, createSubtask, updateSubtask, deleteSubtask,
  listParticipants, addParticipant, updateParticipant, deleteParticipant,
  listAttachments, addAttachment, deleteAttachment,
  listBrands, createBrand, updateBrand,
  listAvailableUsers, listAuditLog, getDashboardStats,
  assignTask, unassignTask,
  importEventCatalog2026
} from "./store.js";
import { renderCalendar } from "./calendar.js";
import { renderTimeline } from "./timeline.js";
import { esc, formatDate, formatDateTime, downloadCSV, showToast } from "./utils.js";
import { renderSettings } from "./views/settings.js";
import {
  getBrandColor,
  getBrandLabel,
  getBrandTheme,
  getBrandLogoIcon,
  getBrandLogoWordmark,
  resolveBrandKey,
} from "./config.js";

// ─── GLOBAL STATE ───────────────────────────────────────────
let activePage = 'Dashboard';
let rootEl;
let filters = { brand: '', search: '', period: '' };
let catalogImportStarted = false;
let brandVisualSettingsById = {};
let globalBrandFilter = "Academy";

const DEFAULT_EVENT_TITLE_PRESETS = [
  'Performance sessie',
  'Kick-off',
  'Masterclass',
  'Netwerkevent',
  'Workshop',
  '1-op-1 Sessie',
  'Review sessie'
];

const DEFAULT_PHYSICAL_LOCATION_PRESETS = [
  'Archer Office',
  'Aula',
  'Seneca',
  'Ander'
];

const DEFAULT_ONLINE_LOCATION_PRESETS = [
  { label: 'Zoom meeting', location: 'Online - Zoom', url: 'https://zoom.us/j/' },
  { label: 'Microsoft Teams', location: 'Online - Teams', url: 'https://teams.microsoft.com/l/meetup-join/' },
  { label: 'Google Meet', location: 'Online - Google Meet', url: 'https://meet.google.com/' },
  { label: 'Webex', location: 'Online - Webex', url: 'https://webex.com/meet/' }
];

// ─── APP SHELL ───────────────────────────────────────────────
export function renderAppShell(root, session) {
  rootEl = root;
  render();
}

async function render() {
  brandVisualSettingsById = await fetchBrandVisualSettings();
  const isListView = ['Dashboard', 'Academy', 'Invest', 'Fund'].includes(activePage);
  const shellBrandKey = resolveShellBrandKey();
  const shellBrandVisual = getBrandVisualSettings(shellBrandKey);
  const shellThemeVars = getBrandCssVars(shellBrandKey, shellBrandVisual);
  const shellBrandDisplay = getBrandDisplayName(shellBrandKey, shellBrandVisual);
  const shellWordmark = shellBrandVisual.logo_url?.trim() || getBrandLogoWordmark(shellBrandKey);
  const shellIcon = getBrandLogoIcon(shellBrandKey);
  const academyNavLabel = getBrandFilterOptionLabel('archer_academy');
  const investNavLabel = getBrandFilterOptionLabel('archer_invest');
  const fundNavLabel = getBrandFilterOptionLabel('archer_fund');
  const pageTitle = getActivePageTitle();

  rootEl.innerHTML = `
    <div class="app-layout" data-brand-theme="${esc(shellBrandKey)}">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo"><img src="${esc(shellWordmark)}" alt="Archer" onerror="this.style.display='none'"></div>
        
        <div class="nav-section">
          <div class="nav-label">Overzichten</div>
          <a class="nav-item ${activePage === 'Dashboard' ? 'active' : ''}" data-page="Dashboard"><span class="nav-icon">📊</span>Dashboard</a>
          <a class="nav-item ${activePage === 'Calendar' ? 'active' : ''}" data-page="Calendar"><span class="nav-icon">📅</span>Kalender</a>
          <a class="nav-item ${activePage === 'Timeline' ? 'active' : ''}" data-page="Timeline"><span class="nav-icon">⏳</span>Tijdlijn</a>
        </div>

        <div class="nav-section">
          <div class="nav-label">Contexten</div>
          <a class="nav-item nav-brand-item ${globalBrandFilter === 'Academy' ? 'active' : ''}" data-brand="Academy"><span class="nav-icon">🎓</span>${esc(academyNavLabel)}</a>
          <a class="nav-item nav-brand-item ${globalBrandFilter === 'Invest' ? 'active' : ''}" data-brand="Invest"><span class="nav-icon">📈</span>${esc(investNavLabel)}</a>
          <a class="nav-item nav-brand-item ${globalBrandFilter === 'Fund' ? 'active' : ''}" data-brand="Fund"><span class="nav-icon">💼</span>${esc(fundNavLabel)}</a>
        </div>

        <div class="nav-section">
          <div class="nav-label">Systeem</div>
          <a class="nav-item ${activePage === 'Admin' ? 'active' : ''}" data-page="Admin"><span class="nav-icon">⚙️</span>Instellingen</a>
        </div>

        <div class="sidebar-footer">
          <button id="logout" class="btn-ghost logout-btn">↪ Uitloggen</button>
        </div>
      </aside>
      <button id="sidebar-backdrop" class="sidebar-backdrop" aria-label="Sluit menu"></button>

      <main class="main-content">
        <div class="wrap">
          <div class="header">
            <div class="header-title-row">
              <button class="btn-ghost sidebar-toggle" id="sidebar-toggle">☰</button>
              <img src="${esc(shellIcon)}" alt="Archer" class="header-brand-icon" onerror="this.style.display='none'">
              <h1>${pageTitle}</h1>
              <span class="header-brand-chip">Archer ${esc(shellBrandDisplay)}</span>
            </div>
            ${isListView || activePage === 'Calendar' ? `
              <div class="header-actions-row">
                <button id="export-csv" class="btn-secondary">⬇ Export CSV</button>
                <button id="add-event" class="btn-primary">+ Nieuw event</button>
              </div>` : ''}
          </div>
          <div id="content-area"></div>
        </div>
      </main>
    </div>`;

  const appLayout = rootEl.querySelector('.app-layout');
  const sidebarEl = rootEl.querySelector('#sidebar');
  const sidebarBackdropEl = rootEl.querySelector('#sidebar-backdrop');
  const mainContentEl = rootEl.querySelector('.main-content');

  const closeSidebar = () => {
    sidebarEl.classList.remove('sidebar-open');
    appLayout.classList.remove('sidebar-open');
    sidebarBackdropEl.classList.remove('sidebar-backdrop-open');
  };

  const openSidebar = () => {
    sidebarEl.classList.add('sidebar-open');
    appLayout.classList.add('sidebar-open');
    sidebarBackdropEl.classList.add('sidebar-backdrop-open');
  };

  const toggleSidebar = () => {
    if (sidebarEl.classList.contains('sidebar-open')) closeSidebar();
    else openSidebar();
  };

  // Navigation handlers
  rootEl.querySelectorAll('.nav-item').forEach(el => el.onclick = () => {
    closeSidebar();
    if(el.dataset.page) {
        activePage = el.dataset.page;
        filters = { brand: ['Academy', 'Invest', 'Fund'].includes(activePage) ? activePage : '', search: '', period: '' };
    } else if (el.dataset.brand) {
        globalBrandFilter = el.dataset.brand;
        if (!['Dashboard', 'Calendar', 'Timeline', 'Admin'].includes(activePage)) {
            activePage = globalBrandFilter;
            filters.brand = globalBrandFilter;
        }
    }
    render();
  });

  // Logout
  rootEl.querySelector('#logout').onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Sidebar toggle
  rootEl.querySelector('#sidebar-toggle').onclick = (e) => {
    e.stopPropagation();
    toggleSidebar();
  };
  sidebarBackdropEl.onclick = closeSidebar;
  sidebarBackdropEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    closeSidebar();
  });

  mainContentEl.addEventListener('contextmenu', (e) => {
    if (!sidebarEl.classList.contains('sidebar-open')) return;
    e.preventDefault();
    closeSidebar();
  });
  mainContentEl.addEventListener('click', () => {
    if (sidebarEl.classList.contains('sidebar-open')) closeSidebar();
  });

  const addBtn = rootEl.querySelector('#add-event');
  if (addBtn) addBtn.onclick = () => openModal(null);

  const exportBtn = rootEl.querySelector('#export-csv');
  if (exportBtn) exportBtn.onclick = async () => {
    const events = await listEvents(filters);
    downloadCSV(events, `events-${activePage}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!catalogImportStarted) {
    catalogImportStarted = true;
    importEventCatalog2026().catch(() => null);
  }

  loadContent();
}

// ─── CONTENT LOADER ──────────────────────────────────────────
async function loadContent() {
  const container = rootEl.querySelector('#content-area');
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  try {
    if (activePage === 'Admin') {
      await renderSettings(container);
    } else if (activePage === 'Calendar') {
      const events = await listEvents();
      renderCalendar(container, events, (ev) => openModal(ev));
    } else if (activePage === 'Timeline') {
      const events = await listEvents();
      renderTimeline(container, events, (ev) => openModal(ev));
    } else {
      filters.brand = activePage === 'Dashboard' ? '' : activePage;
      if(globalBrandFilter && activePage !== 'Dashboard') filters.brand = globalBrandFilter;
      const events = await listEvents(filters);
      renderFilters(container, events);
    }
  } catch (e) {
    container.innerHTML = `<div class="card error-card"><p>⚠ Fout bij laden: ${esc(e.message)}</p></div>`;
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────
async function renderDashboard(container) {
  const [stats, events] = await Promise.all([
    getDashboardStats(),
    listEvents(filters)
  ]);

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-num">${stats.totalEvents}</div><div class="stat-label">Events dit jaar</div></div>
      <div class="stat-card"><div class="stat-num">${stats.upcomingEvents}</div><div class="stat-label">Komende 30 dagen</div></div>
      <div class="stat-card"><div class="stat-num">${stats.confirmedParticipants}</div><div class="stat-label">Bevestigde deelnemers</div></div>
      <div class="stat-card"><div class="stat-num">${stats.openTasks}</div><div class="stat-label">Open taken</div></div>
    </div>`;

  renderFilters(container, events);
}

// ─── FILTERS ─────────────────────────────────────────────────
function renderFilters(container, initialEvents) {
  const academyLabel = getBrandFilterOptionLabel('archer_academy');
  const investLabel = getBrandFilterOptionLabel('archer_invest');
  const fundLabel = getBrandFilterOptionLabel('archer_fund');

  const filterSection = document.createElement('div');
  filterSection.innerHTML = `
    <div class="filter-bar">
      <input type="text" id="f-search" placeholder="🔍 Zoeken op titel..." value="${esc(filters.search)}" class="filter-input">
      <select id="f-brand" class="filter-select">
        <option value="">Alle merken</option>
        <option value="Academy" ${filters.brand === 'Academy' ? 'selected' : ''}>${esc(academyLabel)}</option>
        <option value="Invest" ${filters.brand === 'Invest' ? 'selected' : ''}>${esc(investLabel)}</option>
        <option value="Fund" ${filters.brand === 'Fund' ? 'selected' : ''}>${esc(fundLabel)}</option>
      </select>
      <select id="f-period" class="filter-select">
        <option value="">Alle periodes</option>
        <option value="month" ${filters.period === 'month' ? 'selected' : ''}>Deze maand</option>
        <option value="quarter" ${filters.period === 'quarter' ? 'selected' : ''}>Dit kwartaal</option>
        <option value="year" ${filters.period === 'year' ? 'selected' : ''}>Dit jaar</option>
      </select>
    </div>
    <div id="event-list-area"></div>`;

  container.appendChild(filterSection);
  const listArea = container.querySelector('#event-list-area');
  renderEventList(listArea, initialEvents);

  const applyFilters = async () => {
    filters.search = container.querySelector('#f-search').value;
    filters.brand = container.querySelector('#f-brand').value;
    filters.period = container.querySelector('#f-period').value;
    
    const dashboardBrandKey = filters.brand ? resolveBrandKey(filters.brand) : 'archer_academy';
    syncShellBrandDecor(dashboardBrandKey);

    listArea.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
    const events = await listEvents(filters);
    renderEventList(listArea, events);
  };

  container.querySelector('#f-search').oninput = applyFilters;
  container.querySelector('#f-brand').onchange = applyFilters;
  container.querySelector('#f-period').onchange = applyFilters;
}

// ─── EVENT LIST ───────────────────────────────────────────────
function renderEventList(container, events) {
  if (events.length === 0) {
    container.innerHTML = `
      <div class="card empty-card" style="text-align:center;padding:60px 20px;">
        <div style="font-size:3rem;margin-bottom:16px;">📂</div>
        <h3>Geen resultaten</h3>
        <p class="muted">Pas je filters aan of maak een nieuw event.</p>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'events-grid';

  events.forEach(ev => {
    const el = document.createElement('div');
    el.className = 'card event-card';
    const brandColor = getBrandColor(ev.brand);
    const brandLabel = getBrandLabel(ev.brand);
    el.style.borderTop = `4px solid ${brandColor}`;

    el.innerHTML = `
      <div class="event-card-title">${esc(ev.title)}</div>
      <div class="event-card-meta">
        <span>📅 ${formatDate(ev.start_at)}</span>
        <span>🕒 ${new Date(ev.start_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="event-card-meta">📍 ${esc(ev.location || 'Nog te bepalen')}</div>
      <div class="event-card-footer">
        <span class="badge badge-brand" style="background:${brandColor}20;color:${brandColor};">${esc(brandLabel)}</span>
        ${ev.expected_attendance ? `<span class="muted" style="font-size:0.8rem;">👥 ${ev.expected_attendance} verwacht</span>` : ''}
      </div>`;

    el.onclick = () => openModal(ev);
    grid.appendChild(el);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

// ─── MODAL ───────────────────────────────────────────────────
async function openModal(event) {
  const isEdit = !!event;
  const initialBrand = event?.brand || (['Academy', 'Invest', 'Fund'].includes(activePage) ? activePage : 'Academy');
  const initialBrandKey = resolveBrandKey(initialBrand);
  const initialTheme = getBrandTheme(initialBrandKey);
  const settingsBrand = normalizeBrandForSettings(initialBrand);
  const selectedBrandLabel = getBrandLabel(initialBrand);

  const [availableUsers, titleRows, locationRows, settingsRows, cateringRows] = await Promise.all([
    listAvailableUsers().catch(() => []),
    fetchEventTitleRows(),
    fetchEventLocationRows(),
    fetchEventModalSettings(settingsBrand),
    fetchCateringOptionRows(),
  ]);

  const frequentTitles = getFrequentEventTitles(titleRows);
  const userMap = Object.fromEntries(availableUsers.map(u => [u.id, u.full_name || u.email]));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const brands = ['Academy', 'Invest', 'Fund'];
  const brandOptions = brands
    .map((brand) => `<option value="${brand}" ${selectedBrandLabel === brand ? 'selected' : ''}>${brand}</option>`)
    .join('');
  const initialLocationType = inferLocationType(event?.location, event?.location_url);
  const locationTypeOptions = [
    { value: 'physical', label: 'Fysiek' },
    { value: 'online', label: 'Online' },
    { value: 'hybrid', label: 'Hybride' },
  ];

  overlay.innerHTML = `
    <div class="modal modal-large event-modal" data-brand-theme="${esc(initialBrandKey)}">
      <div class="modal-header">
        <div class="event-modal-brand">
          <img src="${esc(initialTheme.logoIcon)}" alt="Archer icon" onerror="this.style.display='none'">
          <div style="padding: 0.5rem 0;">
            <h3>${isEdit ? 'Details: ' + esc(event.title) : 'nieuw event'}</h3>
          </div>
        </div>
        <button class="btn-ghost" id="m-close">✕</button>
      </div>
      
      <div class="tabs">
        <div class="tab active" data-tab="details">📋 Info</div>
        ${isEdit ? `
        <div class="tab" data-tab="participants">👥 Deelnemers</div>
        <div class="tab" data-tab="tasks">✅ Taken</div>
        <div class="tab" data-tab="attachments">📎 Bijlagen</div>` : ''}
      </div>

      <div class="modal-body">
        <div id="tab-details">
          <div class="grid-2">
            <div>
              <label>Titel evenement *</label>
              <input id="m-title" value="${esc(event?.title || '')}">
            </div>
            <div>
              <label>Veelgebruikte titels</label>
              <select id="m-title-preset"></select>
            </div>
          </div>
          <div class="grid-2" style="margin-top:16px;">
            <div><label>Merk</label><select id="m-brand">${brandOptions}</select></div>
            <div><label>Type event</label><select id="m-loc-type">
              ${locationTypeOptions.map(opt => `<option value="${opt.value}" ${initialLocationType === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select></div>
          </div>
          <div class="grid-2" style="margin-top:16px;">
            <div><label>Startdatum & -tijd</label><input type="datetime-local" id="m-start" value="${(event?.start_at || '').slice(0, 16)}"></div>
            <div><label>Einddatum & -tijd</label><input type="datetime-local" id="m-end" value="${(event?.end_at || '').slice(0, 16)}"></div>
          </div>
          <div class="grid-2" style="margin-top:16px;">
            <div><label>Locatie</label><select id="m-loc-preset"></select></div>
            <div id="location-name-container" style="display: none;"><label>Ander locatie</label><input id="m-loc" value="${esc(event?.location || '')}"></div>
          </div>
          <div class="grid-2" style="margin-top:16px;">
            <div><label>Link naar locatie</label><input id="m-loc-url" value="${esc(event?.location_url || '')}"></div>
          </div>
          <div class="grid-2" style="margin-top:16px;">
            <div><label>Maximale capaciteit</label><input type="number" id="m-cap" value="${event?.capacity || ''}"></div>
            <div><label>Verwacht aantal gasten</label><input type="number" id="m-exp" value="${event?.expected_attendance || ''}"></div>
          </div>
          <div style="margin-top:16px;">
            <label>Catering</label>
            <div id="m-catering-options" style="max-height: 100px; overflow-y: auto; border: 1px solid var(--border-light); padding: 5px; border-radius: 4px;">
            </div>
          </div>
          <div class="grid-2" style="margin-top:16px;">
            <div><label>Cateringkost</label><input id="m-catering-cost" type="text" value="€ 0,00" readonly></div>
            <div><label>Budget</label><input id="m-budget" type="text" placeholder="€" value="${esc(event?.budget || '')}"></div>
          </div>
          <div style="margin-top:16px;"><label>Interne notities</label><textarea id="m-notes" rows="2">${esc(event?.notes_internal || '')}</textarea></div>
        </div>

        ${isEdit ? `
        <div id="tab-participants" style="display:none;"></div>
        <div id="tab-tasks" style="display:none;"></div>
        <div id="tab-attachments" style="display:none;"></div>` : ''}
      </div>

      <div class="modal-footer">
        ${isEdit ? `<button id="m-delete" class="btn-ghost" style="color:var(--danger);margin-right:auto;">🗑 Verwijder</button>` : ''}
        <button id="m-cancel" class="btn-secondary">Annuleren</button>
        <button id="m-save" class="btn-primary">Opslaan</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => { document.body.removeChild(overlay); loadContent(); };
  overlay.querySelector('#m-close').onclick = close;
  overlay.querySelector('#m-cancel').onclick = close;

  const titleEl = overlay.querySelector('#m-title');
  const titlePresetEl = overlay.querySelector('#m-title-preset');
  const brandEl = overlay.querySelector('#m-brand');
  const modalEl = overlay.querySelector('.event-modal');
  const modalIconEl = overlay.querySelector('.event-modal-brand img');
  const locationTypeEl = overlay.querySelector('#m-loc-type');
  const locationPresetEl = overlay.querySelector('#m-loc-preset');
  const locationEl = overlay.querySelector('#m-loc');
  const locationUrlEl = overlay.querySelector('#m-loc-url');
  const capacityEl = overlay.querySelector('#m-cap');
  const expectedEl = overlay.querySelector('#m-exp');

  let modalSettingsRows = settingsRows || [];
  let activeLocationPresets = [];
  let activeCateringOptions = [];

  const syncModalTheme = () => {
    const brandKey = resolveBrandKey(brandEl.value);
    const theme = getBrandTheme(brandKey);
    modalEl.dataset.brandTheme = brandKey;
    if (modalIconEl) modalIconEl.src = theme.logoIcon;
  };

  const rebuildTitlePresets = () => {
    const titlesFromSettings = parseCsvSetting(getModalSettingValue(modalSettingsRows, 'event_title_presets'));
    const titleOptions = uniqueCaseInsensitive([...DEFAULT_EVENT_TITLE_PRESETS, ...titlesFromSettings, ...frequentTitles]);

    titlePresetEl.innerHTML = `
      <option value="">Kies veelgebruikte titel</option>
      ${titleOptions.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
    `;

    const match = titleOptions.find((option) => option.toLowerCase() === String(titleEl.value || '').trim().toLowerCase());
    if (match) titlePresetEl.value = match;
  };

  const rebuildLocationPresets = () => {
    const brandForScope = normalizeBrandForSettings(brandEl.value);
    const settingsPhysical = parseCsvSetting(getModalSettingValue(modalSettingsRows, 'physical_location_presets'));
    const settingsOnline = parseOnlineLocationSetting(getModalSettingValue(modalSettingsRows, 'online_location_presets'));

    const physicalPresets = buildPhysicalLocationPresets(locationRows, brandForScope, settingsPhysical);
    const onlinePresets = buildOnlineLocationPresets(settingsOnline);

    if (locationTypeEl.value === 'online') activeLocationPresets = onlinePresets;
    else if (locationTypeEl.value === 'hybrid') activeLocationPresets = [...physicalPresets, ...onlinePresets];
    else activeLocationPresets = physicalPresets;

    locationPresetEl.innerHTML = `
      <option value="">Kies locatiepreset</option>
      ${activeLocationPresets.map((preset, idx) => `<option value="${idx}">${esc(preset.label)}</option>`).join('')}
    `;

    const currentLocation = String(locationEl.value || '').trim().toLowerCase();
    const matchIdx = activeLocationPresets.findIndex((preset) => String(preset.location || '').trim().toLowerCase() === currentLocation);
    if (matchIdx >= 0) locationPresetEl.value = String(matchIdx);
  };

  const getCateringPriceAmount = (row) => {
    const raw = row?.price_amount ?? row?.price ?? row?.unit_price;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getCateringCurrency = (row) => {
    const currency = String(row?.price_currency || row?.currency || 'EUR').trim().toUpperCase();
    return currency || 'EUR';
  };

  const formatCurrencyValue = (amount, currency = 'EUR') => {
    const numeric = Number.parseFloat(amount);
    if (!Number.isFinite(numeric)) return '-';
    try {
      return new Intl.NumberFormat('nl-BE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numeric);
    } catch {
      return `${numeric.toFixed(2)} ${currency || 'EUR'}`;
    }
  };
  
  const syncCateringCost = () => {
    const cateringOptionsEl = overlay.querySelector('#m-catering-options');
    const cateringCostEl = overlay.querySelector('#m-catering-cost');
    const expectedEl = overlay.querySelector('#m-exp');
    const capacityEl = overlay.querySelector('#m-cap');

    if (!cateringOptionsEl || !cateringCostEl || !expectedEl || !capacityEl) return;

    const selectedCateringNames = Array.from(cateringOptionsEl.querySelectorAll('input[name="catering"]:checked')).map(cb => cb.value);
    let totalCost = 0;
    let currency = 'EUR';

    const expected = Number.parseInt(expectedEl.value || '0', 10);
    const capacity = Number.parseInt(capacityEl.value || '0', 10);
    const attendeeCount = Number.isFinite(expected) && expected > 0 ? expected : (Number.isFinite(capacity) ? Math.max(capacity, 0) : 0);

    if (attendeeCount > 0) {
        selectedCateringNames.forEach(name => {
            const selectedOption = activeCateringOptions.find((entry) => String(entry.name || '') === name);
            if (selectedOption) {
                const priceAmount = getCateringPriceAmount(selectedOption);
                if (priceAmount !== null) {
                    totalCost += priceAmount * attendeeCount;
                    currency = getCateringCurrency(selectedOption);
                }
            }
        });
    }

    cateringCostEl.value = formatCurrencyValue(totalCost, currency);
  };

  const rebuildCateringOptions = () => {
    const cateringOptionsEl = overlay.querySelector('#m-catering-options');
    if (!cateringOptionsEl) return;
    
    const brandForScope = normalizeBrandForSettings(brandEl.value);

    activeCateringOptions = (cateringRows || [])
      .filter((row) => row?.is_active !== false)
      .filter((row) => {
        if (!row?.brand) return true;
        return normalizeBrandForSettings(row.brand) === brandForScope;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'nl'));

    const currentValues = event?.catering ? event.catering.split(',') : [];

    cateringOptionsEl.innerHTML = activeCateringOptions.map((row) => {
        const priceAmount = getCateringPriceAmount(row);
        const priceCurrency = getCateringCurrency(row);
        const supplier = String(row?.supplier_name || row?.supplier || '').trim();
        const priceLabel = priceAmount === null ? '' : ` - ${formatCurrencyValue(priceAmount, priceCurrency)}`;
        const supplierLabel = supplier ? ` (${supplier})` : '';
        const checked = currentValues.includes(row.name) ? 'checked' : '';
        
        return `<div style="margin-bottom: 4px;">
                  <input type="checkbox" id="catering-${row.id}" name="catering" value="${esc(row.name)}" ${checked} style="margin-right: 8px;">
                  <label for="catering-${row.id}">${esc(`${row.name || '-'}${priceLabel}${supplierLabel}`)}</label>
                </div>`;
      }).join('');

    cateringOptionsEl.querySelectorAll('input[name="catering"]').forEach(checkbox => {
        checkbox.addEventListener('change', syncCateringCost);
    });

    syncCateringCost();
  };

  const syncLocationUi = () => {
    if (locationTypeEl.value === 'online') {
      if(locationUrlEl) locationUrlEl.placeholder = 'https://zoom.us/j/...';
      if(locationEl && !locationEl.value.trim()) locationEl.value = 'Online meeting';
    } else if (locationTypeEl.value === 'physical') {
      if(locationUrlEl) locationUrlEl.placeholder = 'https://maps.google.com/...';
    } else {
      if(locationUrlEl) locationUrlEl.placeholder = 'https://...';
    }
  };

  const handleLocationPresetChange = () => {
    const idx = parseInt(locationPresetEl.value, 10);
    const locationNameContainer = overlay.querySelector('#location-name-container');

    if (Number.isNaN(idx)) {
        const currentLocation = locationEl.value.trim();
        if (currentLocation && !activeLocationPresets.some(p => p.location.toLowerCase() === currentLocation.toLowerCase())) {
            const anderIndex = activeLocationPresets.findIndex(p => p.label === 'Ander');
            if (anderIndex >= 0) {
                locationPresetEl.value = anderIndex;
                if(locationNameContainer) locationNameContainer.style.display = 'block';
            }
        } else {
             if(locationNameContainer) locationNameContainer.style.display = 'none';
        }
        return;
    }

    const preset = activeLocationPresets[idx];
    if (!preset) return;

    if (preset.label === 'Ander') {
      if(locationNameContainer) locationNameContainer.style.display = 'block';
    } else {
      if(locationNameContainer) locationNameContainer.style.display = 'none';
      locationEl.value = preset.location || preset.label || '';
      if (preset.url && !locationUrlEl.value.trim()) locationUrlEl.value = preset.url;
    }
  }

  rebuildTitlePresets();
  rebuildLocationPresets();
  rebuildCateringOptions();
  syncLocationUi();
  syncModalTheme();
  handleLocationPresetChange();

  titlePresetEl.onchange = () => {
    if (titlePresetEl.value) titleEl.value = titlePresetEl.value;
  };

  locationTypeEl.onchange = () => {
    rebuildLocationPresets();
    syncLocationUi();
    handleLocationPresetChange();
  };

  locationPresetEl.onchange = handleLocationPresetChange;

  capacityEl.oninput = syncCateringCost;
  expectedEl.oninput = syncCateringCost;

  brandEl.onchange = async () => {
    syncModalTheme();
    modalSettingsRows = await fetchEventModalSettings(normalizeBrandForSettings(brandEl.value));
    rebuildTitlePresets();
    rebuildLocationPresets();
    rebuildCateringOptions();
    handleLocationPresetChange();
  };

  overlay.querySelectorAll('.tab').forEach(t => t.onclick = async () => {
    overlay.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    ['details', 'participants', 'tasks', 'attachments'].forEach(n => {
      const el = overlay.querySelector(`#tab-${n}`);
      if (el) el.style.display = 'none';
    });
    const view = overlay.querySelector(`#tab-${t.dataset.tab}`);
    if (view) view.style.display = 'block';

    if (t.dataset.tab === 'participants') renderParticipantsTab(view, event.id);
    if (t.dataset.tab === 'tasks') renderTasksTab(view, event.id, availableUsers, userMap);
    if (t.dataset.tab === 'attachments') renderAttachmentsTab(view, event.id);
  });

  overlay.querySelector('#m-save').onclick = async () => {
    const payload = {
      title: overlay.querySelector('#m-title').value.trim(),
      brand: overlay.querySelector('#m-brand').value,
      start_at: overlay.querySelector('#m-start').value || null,
      end_at: overlay.querySelector('#m-end').value || null,
      location: overlay.querySelector('#m-loc').value,
      location_url: overlay.querySelector('#m-loc-url').value,
      capacity: parseInt(overlay.querySelector('#m-cap').value) || 0,
      expected_attendance: parseInt(overlay.querySelector('#m-exp').value) || 0,
      catering: Array.from(overlay.querySelectorAll('#m-catering-options input:checked')).map(cb => cb.value).join(','),
      notes_internal: overlay.querySelector('#m-notes').value,
      budget: overlay.querySelector('#m-budget').value,
    };
    if (!payload.title) {
      showToast('Titel is verplicht.', 'error');
      return;
    }
    if (!payload.start_at) {
      showToast('Start datum & tijd is verplicht.', 'error');
      return;
    }
    if (payload.end_at && new Date(payload.end_at).getTime() < new Date(payload.start_at).getTime()) {
      showToast('Eind datum & tijd moet na start datum & tijd liggen.', 'error');
      return;
    }
    if (overlay.querySelector('#m-loc-type').value === 'online' && !String(payload.location_url || '').trim()) {
      showToast('Voor online events is een online link verplicht.', 'error');
      return;
    }
    try {
      if (isEdit) await updateEvent(event.id, payload);
      else await createEvent(payload);
      close();
    } catch (e) {
      showToast(e.message || 'Opslaan mislukt.', 'error');
    }
  };

  if (isEdit) {
    overlay.querySelector('#m-delete').onclick = async () => {
      if (confirm('Dit event definitief verwijderen?')) {
        await deleteEvent(event.id);
        close();
      }
    };
  }
}

async function fetchEventTitleRows() {
  const fallback = [];

  try {
    let { data, error } = await supabase
      .from('events')
      .select('title')
      .is('deleted_at', null)
      .order('start_at', { ascending: false })
      .limit(600);

    if (error && errorHasColumn(error, 'deleted_at')) {
      ({ data, error } = await supabase
        .from('events')
        .select('title')
        .order('start_at', { ascending: false })
        .limit(600));
    }

    if (error && errorHasColumn(error, 'start_at')) {
      ({ data, error } = await supabase.from('events').select('title').limit(600));
    }

    if (error) return fallback;
    return data || fallback;
  } catch {
    return fallback;
  }
}

async function fetchEventLocationRows() {
  const fallback = [];

  try {
    let { data, error } = await supabase
      .from('locations')
      .select('name,city,is_active,brand')
      .order('name');

    if (error && errorHasColumn(error, 'brand')) {
      ({ data, error } = await supabase
        .from('locations')
        .select('name,city,is_active')
        .order('name'));
    }

    if (error && errorHasColumn(error, 'is_active')) {
      ({ data, error } = await supabase
        .from('locations')
        .select('name,city')
        .order('name'));
    }

    if (error) return fallback;
    return data || fallback;
  } catch {
    return fallback;
  }
}

async function fetchEventModalSettings(brandId) {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key,value')
      .eq('brand', brandId)
      .in('key', ['event_title_presets', 'physical_location_presets', 'online_location_presets']);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

async function fetchCateringOptionRows() {
  const selectVariants = [
    'id,name,brand,is_active,price_amount,price,price_currency,currency,supplier_name,supplier',
    'id,name,brand,is_active,price_amount,price,price_currency,currency,supplier',
    'id,name,brand,is_active,price_amount,price',
    'id,name,brand,is_active',
    'id,name,is_active',
    'id,name',
  ];

  for (const columns of selectVariants) {
    try {
      const { data, error } = await supabase.from('catering_options').select(columns).order('name');
      if (!error) return data || [];

      const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
      if (message.includes('relation') && message.includes('catering_options')) return [];
    } catch {
      // Try next variant.
    }
  }

  return [];
}

function getModalSettingValue(settingsRows, key) {
  return settingsRows?.find((row) => row.key === key)?.value || '';
}

function getFrequentEventTitles(rows, limit = 12) {
  const counter = new Map();

  (rows || []).forEach((row) => {
    const title = String(row?.title || '').trim();
    if (!title) return;
    counter.set(title, (counter.get(title) || 0) + 1);
  });

  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nl'))
    .slice(0, limit)
    .map(([title]) => title);
}

function normalizeBrandForSettings(brand) {
  const normalized = String(brand || '').trim().toLowerCase();
  if (normalized.includes('academy')) return 'academy';
  if (normalized.includes('invest')) return 'invest';
  if (normalized.includes('fund')) return 'fund';
  return 'academy';
}

function parseCsvSetting(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseOnlineLocationSetting(value) {
  const rows = String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return rows.map((line) => {
    const [label, location, url] = line.split('|').map((part) => part?.trim() || '');
    const loc = location || label;
    return {
      label: label || loc,
      location: loc,
      url: url || '',
    };
  });
}

function uniqueCaseInsensitive(values) {
  const seen = new Set();
  const list = [];

  (values || []).forEach((value) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push(clean);
  });

  return list;
}

function uniqueLocationPresets(presets) {
  const seen = new Set();
  const list = [];

  (presets || []).forEach((preset) => {
    const label = String(preset?.label || '').trim();
    const location = String(preset?.location || '').trim();
    const url = String(preset?.url || '').trim();
    if (!label && !location) return;

    const normalizedLabel = (label || location).toLowerCase();
    const normalizedLocation = (location || label).toLowerCase();
    const key = `${normalizedLabel}|${normalizedLocation}`;

    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      label: label || location,
      location: location || label,
      url,
    });
  });

  return list;
}

function buildPhysicalLocationPresets(locationRows, brandForScope, settingsPresets) {
  const normalizedBrand = normalizeBrandForSettings(brandForScope);

  const fromLocations = (locationRows || [])
    .filter((row) => row?.is_active !== false)
    .filter((row) => !row?.brand || normalizeBrandForSettings(row.brand) === normalizedBrand)
    .map((row) => {
      const name = String(row?.name || '').trim();
      const city = String(row?.city || '').trim();
      return {
        label: city ? `${name} - ${city}` : name,
        location: name,
        url: '',
      };
    });

  const fromSettings = (settingsPresets || []).map((name) => ({
    label: name,
    location: name,
    url: '',
  }));

  const defaults = DEFAULT_PHYSICAL_LOCATION_PRESETS.map((name) => ({
    label: name,
    location: name,
    url: '',
  }));

  return uniqueLocationPresets([...fromLocations, ...fromSettings, ...defaults]);
}

function buildOnlineLocationPresets(settingsPresets) {
  return uniqueLocationPresets([...(settingsPresets || []), ...DEFAULT_ONLINE_LOCATION_PRESETS]);
}

function inferLocationType(location, locationUrl) {
  const loc = String(location || '').toLowerCase();
  const url = String(locationUrl || '').toLowerCase();
  const onlineSignal = ['zoom', 'teams', 'meet', 'webex', 'online', 'virtual'];
  const isOnline = onlineSignal.some((signal) => loc.includes(signal) || url.includes(signal));
  return isOnline ? 'online' : 'physical';
}

async function fetchBrandVisualSettings() {
  const fallback = {};
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('brand,key,value')
      .in('brand', ['academy', 'invest', 'fund'])
      .in('key', ['accent_color', 'brand_name', 'logo_url']);

    if (error) return fallback;

    return (data || []).reduce((acc, row) => {
      const brandId = String(row?.brand || '').trim();
      const key = String(row?.key || '').trim();
      if (!brandId || !key) return acc;
      if (!acc[brandId]) acc[brandId] = {};
      acc[brandId][key] = row?.value;
      return acc;
    }, {});
  } catch {
    return fallback;
  }
}

function getBrandVisualSettings(rawBrand) {
  const brandId = getBrandId(rawBrand);
  return brandVisualSettingsById?.[brandId] || {};
}

function getBrandCssVars(rawBrand, visualSettings = getBrandVisualSettings(rawBrand)) {
  const accentColor = normalizeHexColor(visualSettings?.accent_color);
  return computeBrandCssVariables(rawBrand, { accentColor });
}

function normalizeBrandDisplayName(rawBrand, value) {
  const clean = String(value || '').trim();
  const brandKey = resolveBrandKey(rawBrand);
  if (!clean) return '';
  if (brandKey === 'archer_fund') {
    const normalized = clean.toLowerCase();
    if (normalized === 'fund' || normalized === 'archer fund') return 'Archer Investment Fund';
  }
  return clean;
}

function getBrandDisplayName(rawBrand, visualSettings = getBrandVisualSettings(rawBrand)) {
  const custom = normalizeBrandDisplayName(rawBrand, visualSettings?.brand_name);
  if (custom) return custom;
  return normalizeBrandDisplayName(rawBrand, getBrandFullLabel(rawBrand));
}

function getBrandFilterOptionLabel(rawBrand) {
  const display = getBrandDisplayName(rawBrand);
  return display;
}

function applyInlineCssVariables(element, variables = {}) {
  if (!element || !variables) return;
  Object.entries(variables).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    element.style.setProperty(key, String(value));
  });
}

function getActivePageTitle() {
  if (activePage === 'Admin') return 'Instellingen';
  if (activePage === 'Calendar') return 'Kalender';

  if (activePage === 'Academy') return getBrandFilterOptionLabel('archer_academy');
  if (activePage === 'Invest') return getBrandFilterOptionLabel('archer_invest');
  if (activePage === 'Fund') return getBrandFilterOptionLabel('archer_fund');

  return activePage;
}

function resolveShellBrandKey() {
  const map = {
    Academy: 'archer_academy',
    Invest: 'archer_invest',
    Fund: 'archer_fund',
  };

  if (map[activePage]) return map[activePage];
  if (activePage === 'Dashboard' && map[filters.brand]) return map[filters.brand];
  return 'archer_academy';
}

function syncShellBrandDecor(brandKey = resolveShellBrandKey()) {
  const appLayout = rootEl?.querySelector('.app-layout');
  if (!appLayout) return;

  const visualSettings = getBrandVisualSettings(brandKey);
  const theme = getBrandTheme(brandKey);
  appLayout.dataset.brandTheme = brandKey;
  applyInlineCssVariables(appLayout, getBrandCssVars(brandKey, visualSettings));


  const sidebarLogo = rootEl.querySelector('.sidebar-logo img');
  if (sidebarLogo) sidebarLogo.src = visualSettings.logo_url?.trim() || theme.logoWordmark;

  const headerIcon = rootEl.querySelector('.header-brand-icon');
  if (headerIcon) headerIcon.src = theme.logoIcon;

  const headerChip = rootEl.querySelector('.header-brand-chip');
  if (headerChip) headerChip.textContent = getBrandDisplayName(brandKey, visualSettings);
}

function errorHasColumn(error, columnName) {
  const haystack = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return haystack.includes('column') && haystack.includes(String(columnName || '').toLowerCase());
}

// ─── PARTICIPANTS TAB ─────────────────────────────────────────
async function renderParticipantsTab(container, eventId) {
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  const participants = await listParticipants(eventId);

  const stats = {
    confirmed: participants.filter(p => p.status === 'confirmed').length,
    invited: participants.filter(p => p.status === 'invited').length,
    declined: participants.filter(p => p.status === 'declined').length
  };

  container.innerHTML = `
    <div class="participant-stats">
      <span class="badge badge-green">✓ ${stats.confirmed} Bevestigd</span>
      <span class="badge badge-yellow">✉ ${stats.invited} Uitgenodigd</span>
      <span class="badge badge-red">✗ ${stats.declined} Afgemeld</span>
      <button id="p-export-btn" class="btn-ghost btn-sm" style="margin-left:auto;">⬇ Export CSV</button>
    </div>
    
    <div class="participant-add-form">
      <input id="pn-name" placeholder="Naam *">
      <input id="pn-email" placeholder="Email">
      <input id="pn-company" placeholder="Bedrijf">
      <input id="pn-role" placeholder="Rol / VIP">
      <input id="pn-phone" placeholder="Telefoon">
      <button id="pn-add" class="btn-primary">Voeg toe</button>
    </div>

    <input type="text" id="p-list-search" placeholder="🔍 Zoek in deelnemerslijst..." class="filter-input" style="margin-bottom:12px;width:100%;">
    <div id="participants-list-rows" style="max-height:300px;overflow-y:auto;"></div>`;

  const renderRows = (query = '') => {
    const filtered = participants.filter(p =>
      !query ||
      (p.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.company || '').toLowerCase().includes(query.toLowerCase())
    );

    const list = container.querySelector('#participants-list-rows');
    list.innerHTML = filtered.length === 0 ? '<p class="muted" style="padding:20px;text-align:center;">Geen deelnemers gevonden.</p>' : '';

    filtered.forEach(p => {
      const row = document.createElement('div');
      row.className = 'participant-row';
      row.innerHTML = `
        <div class="participant-info">
          <div class="participant-name">${esc(p.name)}</div>
          <div class="muted" style="font-size:0.8rem;">
            ${esc(p.email || '-')} ${p.company ? `· ${esc(p.company)}` : ''} ${p.role ? `· ${esc(p.role)}` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <select class="p-status-select" data-id="${p.id}" style="font-size:0.85rem;padding:4px 8px;border:none;background:var(--border-light);font-weight:600;">
            <option value="invited" ${p.status === 'invited' ? 'selected' : ''}>Uitgenodigd</option>
            <option value="confirmed" ${p.status === 'confirmed' ? 'selected' : ''}>Bevestigd</option>
            <option value="declined" ${p.status === 'declined' ? 'selected' : ''}>Afgewezen</option>
          </select>
          <button class="btn-ghost p-del-btn" data-id="${p.id}" style="color:var(--danger);padding:4px;">✕</button>
        </div>`;

      row.querySelector('.p-status-select').onchange = async (e) => {
        await updateParticipant(p.id, { status: e.target.value });
        renderParticipantsTab(container, eventId);
      };
      row.querySelector('.p-del-btn').onclick = async () => {
        if (confirm('Deelnemer verwijderen?')) {
          await deleteParticipant(p.id);
          renderParticipantsTab(container, eventId);
        }
      };
      list.appendChild(row);
    });
  };

  renderRows();
  container.querySelector('#p-list-search').oninput = (e) => renderRows(e.target.value);

  container.querySelector('#pn-add').onclick = async () => {
    const payload = {
      event_id: eventId,
      name: container.querySelector('#pn-name').value.trim(),
      email: container.querySelector('#pn-email').value.trim(),
      company: container.querySelector('#pn-company').value.trim(),
      role: container.querySelector('#pn-role').value.trim(),
      phone: container.querySelector('#pn-phone').value.trim(),
      status: 'invited'
    };
    if (!payload.name) {
      showToast('Naam is verplicht.', 'error');
      return;
    }
    await addParticipant(payload);
    renderParticipantsTab(container, eventId);
  };

  container.querySelector('#p-export-btn').onclick = () => {
    downloadCSV(participants, `deelnemers-${eventId}.csv`);
  };
}

// ─── TASKS TAB ────────────────────────────────────────────────
async function renderTasksTab(container, eventId, availableUsers, userMap) {
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  const tasks = await listTasks(eventId);

  const userOpts = `<option value="">-- Toewijzen --</option>` +
    availableUsers.map(u => `<option value="${u.id}">${esc(u.full_name || u.email)}</option>`).join('');

  container.innerHTML = `
    <div class="task-add-form">
      <input id="tn-title" placeholder="Nieuwe taak titel..." style="grid-column: span 2;">
      <input type="datetime-local" id="tn-due">
      <select id="tn-prio">
        <option value="low">Laag</option>
        <option value="medium" selected>Medium</option>
        <option value="high">Hoog</option>
      </select>
      <select id="tn-assign">${userOpts}</select>
      <button id="tn-add" class="btn-primary" style="grid-column: span 5;">+ Taak toevoegen</button>
    </div>
    <div id="tasks-list-rows" style="margin-top:20px;"></div>`;

  const listArea = container.querySelector('#tasks-list-rows');

  const renderList = async () => {
    const tasks = await listTasks(eventId);
    listArea.innerHTML = tasks.length === 0 ? '<p class="muted" style="text-align:center;padding:20px;">Nog geen taken voor dit event.</p>' : '';

    tasks.forEach(t => {
      const card = document.createElement('div');
      card.className = 'task-card';
      const prioColor = t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warning)' : 'var(--text-muted)';
      card.style.borderLeft = `4px solid ${t.status === 'done' ? 'var(--secondary)' : prioColor}`;

      const assigneeName = t.assignee_user_id ? (userMap[t.assignee_user_id] || 'Onbekend') : 'Niet toegewezen';

      card.innerHTML = `
        <div class="task-main">
          <input type="checkbox" class="t-check" ${t.status === 'done' ? 'checked' : ''} style="width:20px;height:20px;margin-top:2px;">
          <div style="flex:1;">
            <div class="task-title" style="${t.status === 'done' ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${esc(t.title)}</div>
            <div class="task-meta">
              <span class="badge" style="background:${prioColor}15;color:${prioColor};">${t.priority}</span>
              ${t.due_at ? `<span class="muted">📅 ${formatDate(t.due_at)}</span>` : ''}
              <span class="muted">👤 ${esc(assigneeName)}</span>
            </div>
          </div>
          <div class="task-actions">
            <select class="t-status-sel" style="font-size:0.8rem;padding:4px;">
              <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>Todo</option>
              <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>Bezig</option>
              <option value="done" ${t.status === 'done' ? 'selected' : ''}>Klaar</option>
            </select>
            <button class="btn-ghost t-del-btn" style="color:var(--danger);">✕</button>
          </div>
        </div>
        <div class="subtask-area">
          <div class="subtask-list">
            ${(t.subtasks || []).map(st => `
              <div class="subtask-row">
                <input type="checkbox" class="st-check" data-id="${st.id}" ${st.is_completed ? 'checked' : ''}>
                <span style="${st.is_completed ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${esc(st.title)}</span>
                <button class="btn-ghost st-del-btn" data-id="${st.id}" style="margin-left:auto;padding:2px;font-size:0.8rem;">×</button>
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <input class="st-input" placeholder="+ Subtaak..." style="font-size:0.85rem;padding:4px 8px;">
            <button class="btn-ghost st-add-btn" style="font-size:0.85rem;">Toevoegen</button>
          </div>
        </div>`;

      card.querySelector('.t-check').onchange = async (e) => {
        await updateTask(t.id, { status: e.target.checked ? 'done' : 'todo' });
        renderList();
      };
      card.querySelector('.t-status-sel').onchange = async (e) => {
        await updateTask(t.id, { status: e.target.value });
        renderList();
      };
      card.querySelector('.t-del-btn').onclick = async () => {
        if (confirm('Taak verwijderen?')) { await deleteTask(t.id); renderList(); }
      };
      card.querySelectorAll('.st-check').forEach(cb => cb.onchange = async (e) => {
        await updateSubtask(cb.dataset.id, { is_completed: e.target.checked });
        renderList();
      });
      card.querySelectorAll('.st-del-btn').forEach(btn => btn.onclick = async () => {
        await deleteSubtask(btn.dataset.id);
        renderList();
      });
      card.querySelector('.st-add-btn').onclick = async () => {
        const val = card.querySelector('.st-input').value.trim();
        if (!val) return;
        await createSubtask({ task_id: t.id, title: val, is_completed: false });
        renderList();
      };

      listArea.appendChild(card);
    });
  };

  renderList();

  container.querySelector('#tn-add').onclick = async () => {
    const title = container.querySelector('#tn-title').value.trim();
    if (!title) return;
    await createTask({
      event_id: eventId,
      title,
      due_at: container.querySelector('#tn-due').value || null,
      priority: container.querySelector('#tn-prio').value,
      assignee_user_id: container.querySelector('#tn-assign').value || null,
      status: 'todo'
    });
    container.querySelector('#tn-title').value = '';
    renderList();
  };
}

// ─── ATTACHMENTS TAB ─────────────────────────────────────────
async function renderAttachmentsTab(container, eventId) {
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  const attachments = await listAttachments(eventId);

  container.innerHTML = `
    <div class="attachment-add-form">
      <input id="an-title" placeholder="Titel (bijv. Briefing PDF)">
      <input id="an-url" placeholder="URL (Google Drive / Teams / Dropbox link)">
      <select id="an-type">
        <option value="link">Link / Website</option>
        <option value="pdf">PDF Document</option>
        <option value="image">Afbeelding</option>
        <option value="video">Video link</option>
      </select>
      <button id="an-add" class="btn-primary">Toevoegen</button>
    </div>
    <div id="attachments-list" style="margin-top:20px;">
      ${attachments.length === 0 ? '<p class="muted" style="text-align:center;padding:20px;">Nog geen bijlagen toegevoegd.</p>' : attachments.map(a => `
        <div class="attachment-row">
          <span class="attachment-icon">${a.file_type === 'pdf' ? '📄' : a.file_type === 'image' ? '🖼' : a.file_type === 'video' ? '🎬' : '🔗'}</span>
          <div style="flex:1;">
            <div style="font-weight:600;">${esc(a.title || 'Bijlage')}</div>
            <a href="${esc(a.url)}" target="_blank" class="muted" style="font-size:0.8rem;">Link openen ↗</a>
          </div>
          <button class="btn-ghost a-del-btn" data-id="${a.id}" style="color:var(--danger);">✕</button>
        </div>`).join('')}
    </div>`;

  container.querySelectorAll('.a-del-btn').forEach(btn => btn.onclick = async () => {
    if (confirm('Bijlage verwijderen?')) {
      await deleteAttachment(btn.dataset.id);
      renderAttachmentsTab(container, eventId);
    }
  });

  container.querySelector('#an-add').onclick = async () => {
    const url = container.querySelector('#an-url').value.trim();
    const title = container.querySelector('#an-title').value.trim();
    if (!url) {
      showToast('URL is verplicht.', 'error');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    await addAttachment({
      event_id: eventId,
      user_id: user?.id,
      title: title || 'Naamloos',
      url,
      file_type: container.querySelector('#an-type').value
    });
    renderAttachmentsTab(container, eventId);
  };
}
