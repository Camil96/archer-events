import { supabase } from "./supabaseClient.js";
import {
  listEvents, createEvent, updateEvent, deleteEvent,
  listTasks, createTask, updateTask, deleteTask,
  createSubtask, updateSubtask, deleteSubtask,
  listParticipants, addParticipant, updateParticipant, deleteParticipant,
  listAttachments, addAttachment, deleteAttachment,
  listAvailableUsers,
  importEventCatalog2026,
  listCateringItems,
  listEventCatering,
  saveEventCateringLine,
  deleteEventCatering,
  getEventBudget,
  saveEventBudget,
  getFinanceOverview,
  buildFinanceCsvRows,
  buildParticipantsCsvRows,
  setStoreAuthContext,
  store
} from "./store.js";
import { renderCalendar } from "./calendar.js";
import { renderSettings } from "./views/settings.js";
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl, downloadIcsFile } from "./calendarExport.js";
import { getCurrentAppUser, logoutAppUser } from "./auth.js";

// Internal styles
import "./styles.css";
import { esc, formatDate, formatDateTime, downloadCSV, showToast } from "./utils.js";
import {
  getBrandColor,
  getBrandDbValue,
  getBrandLabel,
  getBrandFullLabel,
  getBrandTheme,
  getBrandId,
  getBrandLogoIcon,
  getBrandLogoWordmark,
  resolveBrandKey,
  computeBrandCssVariables,
  cssVarsToInlineStyle,
  normalizeHexColor,
} from "./config.js";

// ─── GLOBAL STATE ───────────────────────────────────────────
let activePage = 'Dashboard';
let rootEl;
let filters = { brand: '', search: '', period: '', status: '', dateFrom: '', dateTo: '' };
let financeFilters = { brand: '', period: 'year', status: '', search: '' };
let catalogImportStarted = false;
let brandVisualSettingsById = {};
let globalBrandFilter = getBrandDbValue(store.brandId || "Academy");

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

function getErrorMessage(error, fallback = 'Er ging iets mis.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error.trim() || fallback;
  return String(error.message || error.details || fallback);
}

async function runUiAction(action, fallbackMessage = 'Actie mislukt.') {
  try {
    return await action();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error, fallbackMessage), 'error');
    return null;
  }
}

// ─── APP SHELL ───────────────────────────────────────────────
export function renderAppShell(root, session) {
  rootEl = root;
  setStoreAuthContext({
    userId: session?.user?.id || null,
    role: session?.user?.role || session?.user?.user_metadata?.role || "viewer",
  });
  render().catch((error) => {
    console.error("App shell render failed:", error);
    if (rootEl) {
      rootEl.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f4f4;">
          <div style="max-width:640px;width:100%;background:#fff;border:1px solid #d6dde6;border-radius:16px;padding:24px;font-family:Inter,system-ui,-apple-system,sans-serif;">
            <h2 style="margin:0 0 12px;color:#000;">Er ging iets mis bij het laden</h2>
            <p style="margin:0 0 16px;color:#2d3036;">Herlaad de pagina of log opnieuw in.</p>
            <button id="archer-reload-btn" style="border:none;background:#0000ff;color:#fff;border-radius:10px;padding:10px 14px;cursor:pointer;">Herlaad</button>
          </div>
        </div>
      `;
      const reloadBtn = rootEl.querySelector("#archer-reload-btn");
      if (reloadBtn) reloadBtn.onclick = () => window.location.reload();
    }
  });
}

async function render() {
  brandVisualSettingsById = await fetchBrandVisualSettings();
  filters.brand = globalBrandFilter || '';
  const canManageEvents = ['Dashboard', 'Calendar'].includes(activePage);
  const canExportFinance = activePage === 'Finance';
  const shellBrandKey = resolveShellBrandKey();
  const shellBrandVisual = getBrandVisualSettings(shellBrandKey);
  const shellThemeVars = getBrandCssVars(shellBrandKey, shellBrandVisual);
  const shellBrandDisplay = getGlobalBrandFilterLabel();
  const shellWordmark = shellBrandVisual.logo_url?.trim() || getBrandLogoWordmark(shellBrandKey);
  const shellIcon = getBrandLogoIcon(shellBrandKey);
  const shellBrandLogo = getBrandLogoWordmark(shellBrandKey);
  const academyNavLogo = getBrandLogoWordmark('archer_academy');
  const investNavLogo = getBrandLogoWordmark('archer_invest');
  const fundNavLogo = getBrandLogoWordmark('archer_fund');
  const academyNavLabel = getBrandFilterOptionLabel('archer_academy');
  const investNavLabel = getBrandFilterOptionLabel('archer_invest');
  const fundNavLabel = getBrandFilterOptionLabel('archer_fund');
  const globalBrandOptions = `
    <option value="">Alle merken</option>
    <option value="Academy" ${globalBrandFilter === "Academy" ? "selected" : ""}>${esc(academyNavLabel)}</option>
    <option value="Invest" ${globalBrandFilter === "Invest" ? "selected" : ""}>${esc(investNavLabel)}</option>
    <option value="Fund" ${globalBrandFilter === "Fund" ? "selected" : ""}>${esc(fundNavLabel)}</option>
  `;
  const pageTitle = getActivePageTitle();

  rootEl.innerHTML = `
    <div class="app-layout" data-brand-theme="${esc(shellBrandKey)}" style="${esc(cssVarsToInlineStyle(shellThemeVars))}">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo"><img src="${esc(shellWordmark)}" alt="Archer" onerror="this.style.display='none'"></div>
        
        <div class="nav-section">
          <div class="nav-label">Overzichten</div>
          <a class="nav-item ${activePage === 'Dashboard' ? 'active' : ''}" data-page="Dashboard"><span class="nav-icon">📊</span>Dashboard</a>
          <a class="nav-item ${activePage === 'Calendar' ? 'active' : ''}" data-page="Calendar"><span class="nav-icon">📅</span>Kalender</a>
          <a class="nav-item ${activePage === 'Finance' ? 'active' : ''}" data-page="Finance"><span class="nav-icon">💶</span>Financiën</a>
        </div>

        <div class="nav-section">
          <div class="nav-label">Contexten</div>
          <a class="nav-item nav-brand-item nav-brand-logo-item ${globalBrandFilter === 'Academy' ? 'active' : ''}" data-brand="Academy" aria-label="${esc(academyNavLabel)}" title="${esc(academyNavLabel)}">
            <img src="${esc(academyNavLogo)}" alt="${esc(academyNavLabel)}" class="nav-brand-logo" onerror="this.style.display='none'">
          </a>
          <a class="nav-item nav-brand-item nav-brand-logo-item ${globalBrandFilter === 'Invest' ? 'active' : ''}" data-brand="Invest" aria-label="${esc(investNavLabel)}" title="${esc(investNavLabel)}">
            <img src="${esc(investNavLogo)}" alt="${esc(investNavLabel)}" class="nav-brand-logo" onerror="this.style.display='none'">
          </a>
          <a class="nav-item nav-brand-item nav-brand-logo-item ${globalBrandFilter === 'Fund' ? 'active' : ''}" data-brand="Fund" aria-label="${esc(fundNavLabel)}" title="${esc(fundNavLabel)}">
            <img src="${esc(fundNavLogo)}" alt="${esc(fundNavLabel)}" class="nav-brand-logo" onerror="this.style.display='none'">
          </a>
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
              <h1>${esc(pageTitle)}</h1>
              <span class="header-brand-chip" title="${esc(shellBrandDisplay)}" aria-label="${esc(shellBrandDisplay)}">
                <img src="${esc(shellBrandLogo)}" alt="${esc(shellBrandDisplay)}" class="header-brand-chip-logo" onerror="this.style.display='none'">
              </span>
            </div>
            <div class="header-actions-row">
              <label class="header-brand-filter">
                <span>Merkfilter</span>
                <select id="global-brand-filter" class="header-brand-select">
                  ${globalBrandOptions}
                </select>
              </label>
              ${canManageEvents || canExportFinance ? `<button id="export-csv" class="btn-secondary">⬇ Exporteer CSV</button>` : ""}
              ${canManageEvents ? `<button id="add-event" class="btn-primary">+ Nieuw event</button>` : ""}
            </div>
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
  rootEl.querySelectorAll('.nav-item[data-page]').forEach(el => el.onclick = () => {
    closeSidebar();
    activePage = el.dataset.page;
    filters = { brand: globalBrandFilter || '', search: '', period: '', status: '', dateFrom: '', dateTo: '' };
    render();
  });

  rootEl.querySelectorAll('.nav-brand-item').forEach(el => el.onclick = () => {
    closeSidebar();
    globalBrandFilter = el.dataset.brand || '';
    filters = { brand: globalBrandFilter || '', search: '', period: '', status: '', dateFrom: '', dateTo: '' };
    if (globalBrandFilter) store.brandId = getBrandId(globalBrandFilter);
    activePage = 'Dashboard';
    render();
  });

  // Logout
  rootEl.querySelector('#logout').onclick = async () => {
    await runUiAction(async () => {
      logoutAppUser();
    }, 'Uitloggen mislukt.');
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

  // Sluit menu bij interactie rechts van de sidebar (ook context menu / right click).
  mainContentEl.addEventListener('contextmenu', (e) => {
    if (!sidebarEl.classList.contains('sidebar-open')) return;
    e.preventDefault();
    closeSidebar();
  });
  mainContentEl.addEventListener('click', () => {
    if (sidebarEl.classList.contains('sidebar-open')) closeSidebar();
  });

  // Add event
  const addBtn = rootEl.querySelector('#add-event');
  if (addBtn) addBtn.onclick = () => openModal(null);

  // Export CSV
  const exportBtn = rootEl.querySelector('#export-csv');
  if (exportBtn) exportBtn.onclick = async () => {
    await runUiAction(async () => {
      if (activePage === 'Finance') {
        const result = await getFinanceOverview({
          ...financeFilters,
          brand: financeFilters.brand || globalBrandFilter || '',
        });
        const rows = buildFinanceCsvRows(result.rows || []);
        downloadCSV(rows, `financien-${new Date().toISOString().slice(0, 10)}.csv`);
        return;
      }

      const events = await listEvents(getActiveEventFilters());
      downloadCSV(events, `events-${activePage}-${new Date().toISOString().slice(0, 10)}.csv`);
    }, 'Exporteren mislukt.');
  };

  const globalBrandFilterEl = rootEl.querySelector('#global-brand-filter');
  if (globalBrandFilterEl) {
    globalBrandFilterEl.onchange = async () => {
      globalBrandFilter = globalBrandFilterEl.value || '';
      filters.brand = globalBrandFilter || '';
      if (globalBrandFilter) store.brandId = getBrandId(globalBrandFilter);
      syncShellBrandDecor(resolveShellBrandKey());
      await loadContent();
    };
  }

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
  const activeFilters = getActiveEventFilters();

  try {
    if (activePage === 'Admin') {
      await renderSettings(container);
    } else if (activePage === 'Finance') {
      await renderFinanceOverview(container);
    } else if (activePage === 'Calendar') {
      const events = await listEvents(activeFilters);
      renderCalendar(container, events, (ev) => openModal(ev));
    } else {
      await renderDashboard(container);
    }
  } catch (e) {
    container.innerHTML = `<div class="card error-card"><p>⚠ ${esc(getErrorMessage(e, 'Gegevens laden mislukt.'))}</p></div>`;
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────
async function renderDashboard(container) {
  const activeFilters = getActiveEventFilters();
  const events = await listEvents(activeFilters);
  const upcomingEvents = getUpcomingEvents(events, 30);
  const upcomingParticipants = await fetchUpcomingParticipantsCount(upcomingEvents.map((event) => event.id));
  const brandCounts = getBrandCountMap(events);

  container.innerHTML = `
    <div class="stats-grid dashboard-kpis-grid">
      <div class="stat-card">
        <div class="stat-num">${upcomingEvents.length}</div>
        <div class="stat-label">Komende events (30 dagen)</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${upcomingParticipants}</div>
        <div class="stat-label">Totaal deelnemers (komend)</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${events.length}</div>
        <div class="stat-label">Events in huidige selectie</div>
      </div>
      <div class="stat-card stat-card-brand-breakdown">
        <div class="stat-label">Events per merk</div>
        <div class="brand-kpi-list">
          <div><span>Academy</span><strong>${brandCounts.Academy}</strong></div>
          <div><span>Invest</span><strong>${brandCounts.Invest}</strong></div>
          <div><span>Fund</span><strong>${brandCounts.Fund}</strong></div>
        </div>
      </div>
    </div>
    ${renderUpcomingTimeline(upcomingEvents)}
  `;

  container.querySelectorAll('.timeline-item').forEach((item) => {
    item.addEventListener('click', () => {
      const eventId = item.dataset.eventId;
      const selected = events.find((event) => String(event.id) === String(eventId));
      if (selected) openModal(selected);
    });
  });

  renderFilters(container, events);
}

function getUpcomingEvents(events = [], daysAhead = 30) {
  const nowStamp = Date.now();
  const endStamp = nowStamp + daysAhead * 24 * 60 * 60 * 1000;
  return (events || [])
    .filter((event) => {
      const stamp = new Date(event.start_at || event.event_date || '').getTime();
      return Number.isFinite(stamp) && stamp >= nowStamp && stamp <= endStamp;
    })
    .sort((a, b) => new Date(a.start_at || a.event_date || '').getTime() - new Date(b.start_at || b.event_date || '').getTime());
}

async function fetchUpcomingParticipantsCount(eventIds = []) {
  const uniqueEventIds = [...new Set((eventIds || []).filter(Boolean))];
  if (!uniqueEventIds.length) return 0;

  try {
    const { count, error } = await supabase
      .from('event_participants')
      .select('id', { count: 'exact', head: true })
      .in('event_id', uniqueEventIds);

    if (error) return 0;
    return Number(count) || 0;
  } catch {
    return 0;
  }
}

function getBrandCountMap(events = []) {
  const counts = { Academy: 0, Invest: 0, Fund: 0 };

  (events || []).forEach((event) => {
    const normalized = getBrandDbValue(event?.brand || '');
    if (Object.prototype.hasOwnProperty.call(counts, normalized)) {
      counts[normalized] += 1;
    }
  });

  return counts;
}

function renderUpcomingTimeline(events = []) {
  if (!events.length) {
    return `
      <div class="card timeline-card empty-card">
        <h3>Komende events</h3>
        <p class="muted">Nog geen events gepland in de komende 30 dagen.</p>
      </div>
    `;
  }

  return `
    <div class="card timeline-card">
      <h3>Komende events</h3>
      <div class="timeline-list">
        ${events
          .slice(0, 8)
          .map((event) => {
            const brandColor = getBrandColor(event.brand);
            const brandLabel = getBrandLabel(event.brand);
            return `
              <button class="timeline-item" data-event-id="${event.id}" style="--timeline-brand:${esc(brandColor)};">
                <div class="timeline-item-main">
                  <strong>${esc(event.title || 'Event')}</strong>
                  <span class="muted">${esc(formatDateTime(event.start_at || event.event_date))}</span>
                </div>
                <div class="timeline-item-meta">
                  <span class="badge ${getEventStatusBadgeClass(event.status)}">${esc(getEventStatusLabel(event.status))}</span>
                  <span class="badge badge-brand" style="background:${brandColor}20;color:${brandColor};">${esc(brandLabel)}</span>
                  <span class="muted">${esc(event.location || 'Locatie volgt')}</span>
                </div>
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function formatEuro(value) {
  const numeric = Number.parseFloat(value);
  const safeNumber = Number.isFinite(numeric) ? numeric : 0;
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNumber);
}

function formatPercent(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return '-';
  return `${numeric.toFixed(1)}%`;
}

function normalizeEventStatus(rawStatus) {
  const value = String(rawStatus || 'gepland').trim().toLowerCase();
  if (value === 'confirmed') return 'bevestigd';
  if (value === 'cancelled') return 'geannuleerd';
  if (value === 'completed') return 'afgerond';
  if (['gepland', 'bevestigd', 'afgerond', 'geannuleerd'].includes(value)) return value;
  return 'gepland';
}

function getEventStatusLabel(rawStatus) {
  const status = normalizeEventStatus(rawStatus);
  if (status === 'bevestigd') return 'Bevestigd';
  if (status === 'afgerond') return 'Afgerond';
  if (status === 'geannuleerd') return 'Geannuleerd';
  return 'Gepland';
}

function getEventStatusBadgeClass(rawStatus) {
  const status = normalizeEventStatus(rawStatus);
  if (status === 'bevestigd') return 'badge-status-confirmed';
  if (status === 'afgerond') return 'badge-status-done';
  if (status === 'geannuleerd') return 'badge-status-cancelled';
  return 'badge-status-planned';
}

async function renderFinanceOverview(container) {
  const effectiveFilters = {
    ...financeFilters,
    brand: financeFilters.brand || globalBrandFilter || '',
  };
  const result = await getFinanceOverview(effectiveFilters);
  const rows = result.rows || [];
  const kpis = result.kpis || {};
  const monthly = result.monthly || [];
  const maxBarValue = Math.max(
    1,
    ...monthly.map((item) => Math.max(Number(item.costs || 0), Number(item.income || 0)))
  );

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-num">${esc(formatEuro(kpis.total_costs || 0))}</div><div class="stat-label">Totale kosten (YTD)</div></div>
      <div class="stat-card"><div class="stat-num">${esc(formatEuro(kpis.total_income || 0))}</div><div class="stat-label">Totale inkomsten (YTD)</div></div>
      <div class="stat-card"><div class="stat-num">${esc(formatEuro(kpis.net_result || 0))}</div><div class="stat-label">Netto resultaat (YTD)</div></div>
      <div class="stat-card"><div class="stat-num">${esc(formatEuro(kpis.avg_cost_per_event || 0))}</div><div class="stat-label">Gemiddelde kost per event</div></div>
    </div>

    <div class="filter-bar finance-filter-bar">
      <select id="finance-brand-filter" class="filter-select">
        <option value="" ${!effectiveFilters.brand ? 'selected' : ''}>Alle merken</option>
        <option value="Academy" ${effectiveFilters.brand === 'Academy' ? 'selected' : ''}>Academy</option>
        <option value="Invest" ${effectiveFilters.brand === 'Invest' ? 'selected' : ''}>Invest</option>
        <option value="Fund" ${effectiveFilters.brand === 'Fund' ? 'selected' : ''}>Fund</option>
      </select>
      <select id="finance-period-filter" class="filter-select">
        <option value="month" ${effectiveFilters.period === 'month' ? 'selected' : ''}>Deze maand</option>
        <option value="quarter" ${effectiveFilters.period === 'quarter' ? 'selected' : ''}>Dit kwartaal</option>
        <option value="year" ${effectiveFilters.period === 'year' || !effectiveFilters.period ? 'selected' : ''}>Dit jaar</option>
      </select>
      <select id="finance-status-filter" class="filter-select">
        <option value="" ${!effectiveFilters.status ? 'selected' : ''}>Alle statussen</option>
        <option value="gepland" ${effectiveFilters.status === 'gepland' ? 'selected' : ''}>Gepland</option>
        <option value="bevestigd" ${effectiveFilters.status === 'bevestigd' ? 'selected' : ''}>Bevestigd</option>
        <option value="afgerond" ${effectiveFilters.status === 'afgerond' ? 'selected' : ''}>Afgerond</option>
        <option value="geannuleerd" ${effectiveFilters.status === 'geannuleerd' ? 'selected' : ''}>Geannuleerd</option>
      </select>
      <input type="search" id="finance-search-filter" class="filter-input" value="${esc(effectiveFilters.search || '')}" placeholder="Zoek event..." />
      <button id="finance-export-csv" class="btn-secondary">⬇ Exporteer CSV</button>
    </div>

    <div class="card finance-chart-card">
      <h3>Kosten vs inkomsten per maand</h3>
      ${
        monthly.length
          ? `<div class="finance-chart-grid">
              ${monthly
                .map((item) => {
                  const costHeight = Math.max(6, (Number(item.costs || 0) / maxBarValue) * 120);
                  const incomeHeight = Math.max(6, (Number(item.income || 0) / maxBarValue) * 120);
                  return `
                    <div class="finance-bar-group">
                      <div class="finance-bars">
                        <div class="finance-bar finance-bar-cost" style="height:${costHeight}px" title="Kosten: ${esc(formatEuro(item.costs || 0))}"></div>
                        <div class="finance-bar finance-bar-income" style="height:${incomeHeight}px" title="Inkomsten: ${esc(formatEuro(item.income || 0))}"></div>
                      </div>
                      <div class="finance-bar-label">${esc(item.month)}</div>
                    </div>
                  `;
                })
                .join('')}
            </div>`
          : '<p class="muted">Nog geen data beschikbaar voor de gekozen filters.</p>'
      }
    </div>

    <div class="card finance-table-card">
      <h3>Financieel overzicht events</h3>
      ${
        rows.length
          ? `
            <div class="table-wrap">
              <table class="event-table finance-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Brand</th>
                    <th>Datum</th>
                    <th>Status</th>
                    <th>Totale kost</th>
                    <th>Totale inkomst</th>
                    <th>Netto</th>
                    <th>Kost/deelnemer</th>
                    <th>Marge</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (row) => `
                    <tr class="finance-row-open" data-event-id="${row.event_id}">
                      <td><strong>${esc(row.title || '-')}</strong></td>
                      <td>${esc(row.brand || '-')}</td>
                      <td>${esc(formatDate(row.start_at))}</td>
                      <td><span class="badge ${getEventStatusBadgeClass(row.status)}">${esc(getEventStatusLabel(row.status))}</span></td>
                      <td>${esc(formatEuro(row.totals?.total_costs || 0))}</td>
                      <td>${esc(formatEuro(row.totals?.total_income || 0))}</td>
                      <td>${esc(formatEuro(row.totals?.net_result || 0))}</td>
                      <td>${esc(formatEuro(row.totals?.cost_per_participant || 0))}</td>
                      <td>${esc(formatPercent(row.totals?.margin_percent))}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          : `<div class="empty-card"><p>Geen financiële data voor de gekozen filters.</p></div>`
      }
    </div>
  `;

  const applyFilterChanges = async () => {
    financeFilters.brand = container.querySelector('#finance-brand-filter')?.value || '';
    financeFilters.period = container.querySelector('#finance-period-filter')?.value || 'year';
    financeFilters.status = container.querySelector('#finance-status-filter')?.value || '';
    financeFilters.search = container.querySelector('#finance-search-filter')?.value?.trim() || '';
    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
    await renderFinanceOverview(container);
  };

  container.querySelector('#finance-brand-filter')?.addEventListener('change', applyFilterChanges);
  container.querySelector('#finance-period-filter')?.addEventListener('change', applyFilterChanges);
  container.querySelector('#finance-status-filter')?.addEventListener('change', applyFilterChanges);
  container.querySelector('#finance-search-filter')?.addEventListener('input', applyFilterChanges);

  container.querySelector('#finance-export-csv')?.addEventListener('click', () => {
    const exportRows = buildFinanceCsvRows(rows);
    downloadCSV(exportRows, `finance-overzicht-${new Date().toISOString().slice(0, 10)}.csv`);
  });

  container.querySelectorAll('.finance-row-open').forEach((rowEl) => {
    rowEl.addEventListener('click', async () => {
      await runUiAction(async () => {
        const eventId = rowEl.dataset.eventId;
        if (!eventId) return;
        const allEvents = await listEvents({ brand: '', period: '', search: '' });
        const selectedEvent = allEvents.find((event) => String(event.id) === String(eventId));
        if (!selectedEvent) {
          showToast('Event niet gevonden.', 'error');
          return;
        }
        openModal(selectedEvent);
      }, 'Eventdetail laden mislukt.');
    });
  });
}

// ─── FILTERS ─────────────────────────────────────────────────
function renderFilters(container, initialEvents) {
  const selectedBrand = filters.brand || globalBrandFilter || '';
  const academyLabel = getBrandFilterOptionLabel('archer_academy');
  const investLabel = getBrandFilterOptionLabel('archer_invest');
  const fundLabel = getBrandFilterOptionLabel('archer_fund');

  const filterSection = document.createElement('div');
  filterSection.innerHTML = `
    <div class="filter-bar">
      <input type="text" id="f-search" placeholder="🔍 Zoek op titel of locatie..." value="${esc(filters.search)}" class="filter-input">
      <select id="f-brand" class="filter-select">
        <option value="" ${!selectedBrand ? 'selected' : ''}>Alle merken</option>
        <option value="Academy" ${selectedBrand === 'Academy' ? 'selected' : ''}>${esc(academyLabel)}</option>
        <option value="Invest" ${selectedBrand === 'Invest' ? 'selected' : ''}>${esc(investLabel)}</option>
        <option value="Fund" ${selectedBrand === 'Fund' ? 'selected' : ''}>${esc(fundLabel)}</option>
      </select>
      <select id="f-status" class="filter-select">
        <option value="" ${!filters.status ? 'selected' : ''}>Alle statussen</option>
        <option value="gepland" ${filters.status === 'gepland' ? 'selected' : ''}>Gepland</option>
        <option value="bevestigd" ${filters.status === 'bevestigd' ? 'selected' : ''}>Bevestigd</option>
        <option value="afgerond" ${filters.status === 'afgerond' ? 'selected' : ''}>Afgerond</option>
        <option value="geannuleerd" ${filters.status === 'geannuleerd' ? 'selected' : ''}>Geannuleerd</option>
      </select>
      <select id="f-period" class="filter-select">
        <option value="">Alle periodes</option>
        <option value="month" ${filters.period === 'month' ? 'selected' : ''}>Deze maand</option>
        <option value="quarter" ${filters.period === 'quarter' ? 'selected' : ''}>Dit kwartaal</option>
        <option value="year" ${filters.period === 'year' ? 'selected' : ''}>Dit jaar</option>
      </select>
      <input type="date" id="f-date-from" value="${esc(filters.dateFrom || '')}" class="filter-select">
      <input type="date" id="f-date-to" value="${esc(filters.dateTo || '')}" class="filter-select">
      <button id="f-reset" class="btn-ghost filter-reset-btn" type="button">Alle filters resetten</button>
    </div>
    <div id="event-list-area"></div>`;

  container.appendChild(filterSection);
  const listArea = container.querySelector('#event-list-area');
  renderEventList(listArea, initialEvents);

  const applyFilters = async () => {
    filters.search = container.querySelector('#f-search')?.value?.trim() || '';
    filters.brand = container.querySelector('#f-brand')?.value || '';
    filters.status = container.querySelector('#f-status')?.value || '';
    filters.period = container.querySelector('#f-period')?.value || '';
    filters.dateFrom = container.querySelector('#f-date-from')?.value || '';
    filters.dateTo = container.querySelector('#f-date-to')?.value || '';

    if (globalBrandFilter !== filters.brand) {
      globalBrandFilter = filters.brand;
      if (globalBrandFilter) store.brandId = getBrandId(globalBrandFilter);
      syncShellBrandDecor(resolveShellBrandKey());
    }

    listArea.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
    await runUiAction(async () => {
      const events = await listEvents(getActiveEventFilters());
      renderEventList(listArea, events);
    }, 'Events laden met filters mislukt.');
  };

  container.querySelector('#f-search').oninput = applyFilters;
  container.querySelector('#f-brand').onchange = applyFilters;
  container.querySelector('#f-status').onchange = applyFilters;
  container.querySelector('#f-period').onchange = applyFilters;
  container.querySelector('#f-date-from').onchange = applyFilters;
  container.querySelector('#f-date-to').onchange = applyFilters;
  container.querySelector('#f-reset').onclick = async () => {
    filters = { brand: '', search: '', period: '', status: '', dateFrom: '', dateTo: '' };
    globalBrandFilter = '';
    syncShellBrandDecor(resolveShellBrandKey());

    const searchEl = container.querySelector('#f-search');
    const brandEl = container.querySelector('#f-brand');
    const statusEl = container.querySelector('#f-status');
    const periodEl = container.querySelector('#f-period');
    const dateFromEl = container.querySelector('#f-date-from');
    const dateToEl = container.querySelector('#f-date-to');

    if (searchEl) searchEl.value = '';
    if (brandEl) brandEl.value = '';
    if (statusEl) statusEl.value = '';
    if (periodEl) periodEl.value = '';
    if (dateFromEl) dateFromEl.value = '';
    if (dateToEl) dateToEl.value = '';

    await applyFilters();
    showToast('Filters zijn gereset.', 'success');
  };
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
    const statusLabel = getEventStatusLabel(ev.status);
    const statusClass = getEventStatusBadgeClass(ev.status);
    el.style.borderTop = `4px solid ${brandColor}`;

    el.innerHTML = `
      <div class="event-card-title">${esc(ev.title)}</div>
      <div class="event-card-meta">
        <span>📅 ${formatDate(ev.start_at)}</span>
        <span>🕒 ${new Date(ev.start_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="event-card-meta">📍 ${esc(ev.location || 'Nog te bepalen')}</div>
      <div class="event-card-footer">
        <div class="event-card-badges">
          <span class="badge ${statusClass}">${esc(statusLabel)}</span>
          <span class="badge badge-brand" style="background:${brandColor}20;color:${brandColor};">${esc(brandLabel)}</span>
        </div>
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
  const initialBrand = event?.brand || globalBrandFilter || getBrandDbValue(store.brandId || "Academy");
  const selectedBrandValue = getBrandDbValue(initialBrand);
  const initialBrandKey = resolveBrandKey(initialBrand);
  const initialBrandVisual = getBrandVisualSettings(initialBrandKey);
  const initialTheme = getBrandTheme(initialBrandKey);
  const initialThemeVars = getBrandCssVars(initialBrandKey, initialBrandVisual);
  const settingsBrand = normalizeBrandForSettings(initialBrand);

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

  const brands = [
    { value: 'Academy', key: 'archer_academy' },
    { value: 'Invest', key: 'archer_invest' },
    { value: 'Fund', key: 'archer_fund' },
  ];
  const brandOptions = brands
    .map((brand) => {
      const label = getBrandFilterOptionLabel(brand.key);
      return `<option value="${brand.value}" ${selectedBrandValue === brand.value ? 'selected' : ''}>${esc(label)}</option>`;
    })
    .join('');
  const initialLocationType = inferLocationType(event?.location, event?.location_url);
  const locationTypeOptions = [
    { value: 'physical', label: 'Fysiek' },
    { value: 'online', label: 'Online' },
    { value: 'hybrid', label: 'Hybride' },
  ];

  overlay.innerHTML = `
    <div class="modal modal-large event-modal" data-brand-theme="${esc(initialBrandKey)}" style="${esc(cssVarsToInlineStyle(initialThemeVars))}">
      <div class="modal-header">
        <div class="event-modal-brand">
          <img src="${esc(initialTheme.logoIcon)}" alt="Archer icon" onerror="this.style.display='none'">
          <div>
            <h3>${isEdit ? 'Details: ' + esc(event.title) : 'Nieuw Event'}</h3>
          </div>
        </div>
        <button class="btn-ghost" id="m-close">✕</button>
      </div>
      
      <div class="tabs">
        <div class="tab active" data-tab="details">📋 Info</div>
        ${isEdit ? `
        <div class="tab" data-tab="participants">👥 Deelnemers</div>
        <div class="tab" data-tab="catering-budget">🍽 Catering & Budget</div>
        <div class="tab" data-tab="financial-overview">💶 Financieel overzicht</div>
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
            <div id="m-loc-preset-container"><label id="l-loc-preset">Locatie presets</label><select id="m-loc-preset"></select></div>
            <div><label>Tijdzone</label><select id="m-tz">
              <option value="Europe/Brussels" ${(event?.timezone || 'Europe/Brussels') === 'Europe/Brussels' ? 'selected' : ''}>Europe/Brussels</option>
              <option value="UTC" ${event?.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
            </select></div>
          </div>
          <div class="grid-2" style="margin-top:16px;" id="m-loc-container">
            <div><label>Locatie naam</label><input id="m-loc" value="${esc(event?.location || '')}"></div>
            <div><label>Link naar locatie</label><input id="m-loc-url" value="${esc(event?.location_url || '')}"></div>
          </div>
          <div class="grid-2" style="margin-top:16px;">
            <div><label>Maximale capaciteit</label><input type="number" id="m-cap" value="${event?.capacity || ''}"></div>
            <div><label>Verwacht aantal gasten</label><input type="number" id="m-exp" value="${event?.expected_attendance || ''}"></div>
          </div>
          <div class="grid-2" style="margin-top:16px;">
            <div><label>Catering</label><select id="m-catering"></select></div>
            <div><label>Cateringkost</label><input id="m-catering-estimate" type="text" value="-" readonly></div>
          </div>
          <div style="margin-top:16px;">
            <label>Budget</label>
            <div style="position:relative;">
              <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);">€</span>
              <input id="m-budget" type="number" step="0.01" value="${event?.budget || ''}" style="padding-left:30px;" placeholder="0,00">
            </div>
          </div>
          <div style="margin-top:16px;"><label>Interne notities</label><textarea id="m-notes" rows="2">${esc(event?.notes_internal || '')}</textarea></div>
          ${
            isEdit
              ? `
                <div class="calendar-export-panel">
                  <label>Agenda-integratie</label>
                  <div class="calendar-export-actions">
                    <button type="button" id="m-calendar-google" class="btn-secondary">Voeg toe aan Google Calendar</button>
                    <button type="button" id="m-calendar-outlook" class="btn-secondary">Voeg toe aan Outlook</button>
                    <button type="button" id="m-calendar-ics" class="btn-secondary">Download .ics</button>
                  </div>
                </div>
              `
              : ''
          }
        </div>

        ${isEdit ? `
        <div id="tab-participants" style="display:none;"></div>
        <div id="tab-catering-budget" style="display:none;"></div>
        <div id="tab-financial-overview" style="display:none;"></div>
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
  const timezoneEl = overlay.querySelector('#m-tz');
  const capacityEl = overlay.querySelector('#m-cap');
  const expectedEl = overlay.querySelector('#m-exp');
  const cateringEl = overlay.querySelector('#m-catering');
  const cateringEstimateEl = overlay.querySelector('#m-catering-estimate');

  const buildCalendarExportEvent = () => ({
    id: event?.id || null,
    title: overlay.querySelector('#m-title')?.value?.trim() || event?.title || 'Archer Event',
    start_at: overlay.querySelector('#m-start')?.value || event?.start_at || event?.event_date || '',
    end_at: overlay.querySelector('#m-end')?.value || event?.end_at || '',
    location: overlay.querySelector('#m-loc')?.value?.trim() || event?.location || '',
    description: event?.description || '',
    notes_internal: overlay.querySelector('#m-notes')?.value?.trim() || event?.notes_internal || '',
  });

  let modalSettingsRows = settingsRows || [];
  let activeLocationPresets = [];
  let activeCateringOptions = [];

  const syncModalTheme = () => {
    const brandKey = resolveBrandKey(brandEl.value);
    const theme = getBrandTheme(brandKey);
    modalEl.dataset.brandTheme = brandKey;
    applyInlineCssVariables(modalEl, getBrandCssVars(brandKey));
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

  const syncCateringEstimate = () => {
    const selectedName = cateringEl.value;
    const selectedOption = activeCateringOptions.find((entry) => String(entry.name || '') === selectedName);
    const priceAmount = getCateringPriceAmount(selectedOption);
    const currency = getCateringCurrency(selectedOption);
    const expected = Number.parseInt(expectedEl.value || '0', 10);
    const capacity = Number.parseInt(capacityEl.value || '0', 10);
    const attendeeCount = Number.isFinite(expected) && expected > 0 ? expected : (Number.isFinite(capacity) ? Math.max(capacity, 0) : 0);

    if (!selectedOption || priceAmount === null || attendeeCount <= 0) {
      cateringEstimateEl.value = '-';
      return;
    }

    const estimate = attendeeCount * priceAmount;
    cateringEstimateEl.value = `${formatCurrencyValue(estimate, currency)} (${attendeeCount} gasten)`;
  };

  const rebuildCateringOptions = () => {
    const brandForScope = normalizeBrandForSettings(brandEl.value);

    activeCateringOptions = (cateringRows || [])
      .filter((row) => row?.is_active !== false)
      .filter((row) => {
        if (!row?.brand) return true;
        return normalizeBrandForSettings(row.brand) === brandForScope;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'nl'));

    const currentValue = String(cateringEl.value || event?.catering || '').trim();
    const hasCurrentValue = currentValue && activeCateringOptions.some((row) => String(row?.name || '') === currentValue);

    cateringEl.innerHTML = `
      <option value="">Geen catering</option>
      ${activeCateringOptions.map((row) => {
      const priceAmount = getCateringPriceAmount(row);
      const priceCurrency = getCateringCurrency(row);
      const supplier = String(row?.supplier_name || row?.supplier || '').trim();
      const priceLabel = priceAmount === null ? '' : ` - ${formatCurrencyValue(priceAmount, priceCurrency)}`;
      const supplierLabel = supplier ? ` (${supplier})` : '';
      const selected = String(row?.name || '') === currentValue ? 'selected' : '';
      return `<option value="${esc(row?.name || '')}" ${selected}>${esc(`${row?.name || '-'}${priceLabel}${supplierLabel}`)}</option>`;
    }).join('')}
      ${currentValue && !hasCurrentValue ? `<option value="${esc(currentValue)}" selected>${esc(currentValue)}</option>` : ''}
    `;

    syncCateringEstimate();
  };

  const syncLocationUi = () => {
    if (locationTypeEl.value === 'online') {
      locationUrlEl.placeholder = 'https://zoom.us/j/...';
      if (!locationEl.value.trim()) locationEl.value = 'Online meeting';
      if (timezoneEl.value === 'UTC') timezoneEl.value = 'Europe/Brussels';
    } else if (locationTypeEl.value === 'physical') {
      locationUrlEl.placeholder = 'https://maps.google.com/...';
    } else {
      locationUrlEl.placeholder = 'https://...';
    }
  };

  rebuildTitlePresets();
  rebuildLocationPresets();
  rebuildCateringOptions();
  syncLocationUi();
  syncModalTheme();
  syncCateringEstimate();

  titlePresetEl.onchange = () => {
    if (titlePresetEl.value) titleEl.value = titlePresetEl.value;
  };

  locationTypeEl.onchange = () => {
    rebuildLocationPresets();
    syncLocationUi();
  };

  locationPresetEl.onchange = () => {
    const idx = parseInt(locationPresetEl.value, 10);
    const locPresetLabel = overlay.querySelector('#l-loc-preset');
    const locNameContainer = overlay.querySelector('#m-loc-container div:first-child');
    const locUrlContainer = overlay.querySelector('#m-loc-container div:last-child');

    if (Number.isNaN(idx)) {
      locPresetLabel.textContent = 'Locatie presets';
      locNameContainer.style.display = 'block';
      return;
    }

    const preset = activeLocationPresets[idx];
    if (!preset) return;

    if (preset.label === 'Ander') {
      locPresetLabel.textContent = 'Locatie';
      locNameContainer.style.display = 'none';
      locationEl.value = '';
    } else {
      locPresetLabel.textContent = 'Locatie presets';
      locNameContainer.style.display = 'block';
      locationEl.value = preset.location || preset.label || '';
    }

    if (preset.url && !locationUrlEl.value.trim()) locationUrlEl.value = preset.url;
  };

  cateringEl.onchange = () => {
    syncCateringEstimate();
  };
  capacityEl.oninput = syncCateringEstimate;
  expectedEl.oninput = syncCateringEstimate;

  brandEl.onchange = async () => {
    syncModalTheme();
    modalSettingsRows = await fetchEventModalSettings(normalizeBrandForSettings(brandEl.value));
    rebuildTitlePresets();
    rebuildLocationPresets();
    rebuildCateringOptions();
  };

  if (isEdit) {
    const googleBtn = overlay.querySelector('#m-calendar-google');
    const outlookBtn = overlay.querySelector('#m-calendar-outlook');
    const icsBtn = overlay.querySelector('#m-calendar-ics');

    if (googleBtn) {
      googleBtn.onclick = async () => {
        await runUiAction(async () => {
          const target = buildCalendarExportEvent();
          const href = buildGoogleCalendarUrl(target);
          window.open(href, '_blank', 'noopener,noreferrer');
        }, 'Google Calendar-link maken mislukt.');
      };
    }

    if (outlookBtn) {
      outlookBtn.onclick = async () => {
        await runUiAction(async () => {
          const target = buildCalendarExportEvent();
          const href = buildOutlookCalendarUrl(target);
          window.open(href, '_blank', 'noopener,noreferrer');
        }, 'Outlook-link maken mislukt.');
      };
    }

    if (icsBtn) {
      icsBtn.onclick = async () => {
        await runUiAction(async () => {
          const target = buildCalendarExportEvent();
          downloadIcsFile(target);
          showToast('ICS-bestand gedownload.', 'success');
        }, 'ICS-bestand maken mislukt.');
      };
    }
  }

  overlay.querySelectorAll('.tab').forEach(t => t.onclick = async () => {
    overlay.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    ['details', 'participants', 'catering-budget', 'financial-overview', 'tasks', 'attachments'].forEach(n => {
      const el = overlay.querySelector(`#tab-${n}`);
      if (el) el.style.display = 'none';
    });
    const view = overlay.querySelector(`#tab-${t.dataset.tab}`);
    if (view) view.style.display = 'block';

    if (t.dataset.tab === 'participants') renderParticipantsTab(view, event);
    if (t.dataset.tab === 'catering-budget') renderEventCateringBudgetTab(view, event);
    if (t.dataset.tab === 'financial-overview') renderEventFinancialOverviewTab(view, event);
    if (t.dataset.tab === 'tasks') renderTasksTab(view, event.id, availableUsers, userMap);
    if (t.dataset.tab === 'attachments') renderAttachmentsTab(view, event.id);
  });

  overlay.querySelector('#m-save').onclick = async () => {
    const budgetValueRaw = overlay.querySelector('#m-budget').value;
    const parsedBudget = Number.parseFloat(budgetValueRaw);
    const payload = {
      title: overlay.querySelector('#m-title').value.trim(),
      brand: overlay.querySelector('#m-brand').value,
      start_at: overlay.querySelector('#m-start').value || null,
      end_at: overlay.querySelector('#m-end').value || null,
      location: overlay.querySelector('#m-loc').value,
      location_url: overlay.querySelector('#m-loc-url').value,
      capacity: parseInt(overlay.querySelector('#m-cap').value) || 0,
      expected_attendance: parseInt(overlay.querySelector('#m-exp').value) || 0,
      catering: overlay.querySelector('#m-catering').value || null,
      timezone: overlay.querySelector('#m-tz').value,
      budget: Number.isFinite(parsedBudget) ? parsedBudget : null,
      description: event?.description || '', // Keep description as is since we removed the field but might still want to preserve it or just pass empty
      notes_internal: overlay.querySelector('#m-notes').value,
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
      if (isEdit) {
        await updateEvent(event.id, payload);
        showToast('Event bijgewerkt.', 'success');
      } else {
        await createEvent(payload);
        showToast('Event aangemaakt.', 'success');
      }
      close();
    } catch (e) {
      showToast(e.message || 'Opslaan mislukt.', 'error');
    }
  };

  if (isEdit) {
    overlay.querySelector('#m-delete').onclick = async () => {
      if (confirm('Dit event definitief verwijderen?')) {
        await runUiAction(async () => {
          await deleteEvent(event.id);
          showToast('Event verwijderd.', 'success');
          close();
        }, 'Verwijderen mislukt.');
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
  try {
    const items = await listCateringItems({ includeInactive: true });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand_key,
      is_active: item.is_active,
      price_amount: item.unit_price,
      price_currency: 'EUR',
      supplier_name: item.supplier_name || '',
    }));
  } catch {
    return [];
  }
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

  // Use locations from DB + settings. Only fall back to hardcoded defaults when neither has entries.
  const hasDbOrSettingsLocations = fromLocations.length > 0 || fromSettings.length > 0;
  const defaults = hasDbOrSettingsLocations
    ? []
    : DEFAULT_PHYSICAL_LOCATION_PRESETS.filter((n) => n !== 'Ander').map((name) => ({
        label: name,
        location: name,
        url: '',
      }));

  const presets = uniqueLocationPresets([...fromLocations, ...fromSettings, ...defaults]);

  // Always append "Ander" as the last option
  const anderEntry = { label: 'Ander', location: 'Ander', url: '' };
  const hasAnder = presets.some((p) => p.label.toLowerCase() === 'ander');
  if (!hasAnder) presets.push(anderEntry);

  return presets;
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

function getActiveEventFilters() {
  return {
    brand: filters.brand || '',
    search: filters.search || '',
    period: filters.period || '',
    status: filters.status || '',
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
  };
}

function getActivePageTitle() {
  if (activePage === 'Admin') return 'Instellingen';
  if (activePage === 'Calendar') return 'Kalender';
  if (activePage === 'Finance') return 'Financiën';
  if (activePage === 'Dashboard') return 'Dashboard';
  return 'Dashboard';
}

function getGlobalBrandFilterLabel() {
  if (!globalBrandFilter) return 'Alle merken';
  return getBrandDisplayName(globalBrandFilter);
}

function resolveShellBrandKey() {
  if (globalBrandFilter) return resolveBrandKey(globalBrandFilter);
  if (store.brandId) return resolveBrandKey(store.brandId);
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
  if (headerChip) {
    const brandLabel = getGlobalBrandFilterLabel();
    headerChip.title = brandLabel;
    headerChip.setAttribute('aria-label', brandLabel);
  }

  const headerChipLogo = rootEl.querySelector('.header-brand-chip-logo');
  if (headerChipLogo) headerChipLogo.src = visualSettings.logo_url?.trim() || theme.logoWordmark;

  const headerBrandFilter = rootEl.querySelector('#global-brand-filter');
  if (headerBrandFilter) headerBrandFilter.value = globalBrandFilter || '';

  rootEl.querySelectorAll('.nav-brand-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.brand === globalBrandFilter);
  });
}

function errorHasColumn(error, columnName) {
  const haystack = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return haystack.includes('column') && haystack.includes(String(columnName || '').toLowerCase());
}

// ─── PARTICIPANTS TAB ─────────────────────────────────────────
async function renderParticipantsTab(container, eventRef) {
  const eventId = typeof eventRef === 'object' ? eventRef?.id : eventRef;
  const eventBrand = typeof eventRef === 'object' ? eventRef?.brand : '';
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
      <button id="p-export-btn" class="btn-ghost btn-sm" style="margin-left:auto;">⬇ Exporteer CSV</button>
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
        await runUiAction(async () => {
          await updateParticipant(p.id, { status: e.target.value });
          renderParticipantsTab(container, eventRef);
        }, 'Status bijwerken mislukt.');
      };
      row.querySelector('.p-del-btn').onclick = async () => {
        if (confirm('Deelnemer verwijderen?')) {
          await runUiAction(async () => {
            await deleteParticipant(p.id);
            showToast('Deelnemer verwijderd.', 'success');
            renderParticipantsTab(container, eventRef);
          }, 'Deelnemer verwijderen mislukt.');
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
    await runUiAction(async () => {
      await addParticipant(payload);
      showToast('Deelnemer toegevoegd.', 'success');
      renderParticipantsTab(container, eventRef);
    }, 'Deelnemer toevoegen mislukt.');
  };

  container.querySelector('#p-export-btn').onclick = () => {
    const exportRows = buildParticipantsCsvRows(
      participants.map((participant) => ({
        ...participant,
        brand: participant.brand || eventBrand || globalBrandFilter || '',
      }))
    );
    downloadCSV(exportRows, `deelnemers-${eventId}.csv`);
  };
}

function toBudgetNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGenericCostRows(rows = []) {
  return (rows || []).map((row) => ({
    description: String(row?.description || row?.name || '').trim(),
    amount: toBudgetNumber(row?.amount),
  }));
}

function normalizeSpeakerCostRows(rows = []) {
  return (rows || []).map((row) => ({
    name: String(row?.name || row?.description || '').trim(),
    fee: toBudgetNumber(row?.fee ?? row?.amount),
    travel: toBudgetNumber(row?.travel),
  }));
}

function computeBudgetTotals(state, participantsCount, cateringTotal) {
  const locationCost = toBudgetNumber(state.location_cost);
  const speakerTotal = (state.speaker_costs || []).reduce(
    (sum, row) => sum + toBudgetNumber(row?.fee) + toBudgetNumber(row?.travel),
    0
  );
  const materialTotal = (state.material_costs || []).reduce((sum, row) => sum + toBudgetNumber(row?.amount), 0);
  const marketingTotal = (state.marketing_costs || []).reduce((sum, row) => sum + toBudgetNumber(row?.amount), 0);
  const otherTotal = (state.other_costs || []).reduce((sum, row) => sum + toBudgetNumber(row?.amount), 0);
  const totalCosts = locationCost + cateringTotal + speakerTotal + materialTotal + marketingTotal + otherTotal;
  const ticketPrice = toBudgetNumber(state.ticket_price);
  const hasIncomeOverride = state.income_override !== null && state.income_override !== undefined && state.income_override !== '';
  const totalIncome = hasIncomeOverride ? toBudgetNumber(state.income_override) : participantsCount * ticketPrice;
  const netResult = totalIncome - totalCosts;
  const breakEven = ticketPrice > 0 ? totalCosts / ticketPrice : null;
  const costPerParticipant = participantsCount > 0 ? totalCosts / participantsCount : null;
  const marginPercent = totalIncome > 0 ? (netResult / totalIncome) * 100 : null;

  return {
    locationCost,
    speakerTotal,
    materialTotal,
    marketingTotal,
    otherTotal,
    totalCosts,
    ticketPrice,
    totalIncome,
    netResult,
    breakEven,
    costPerParticipant,
    marginPercent,
  };
}

function renderBudgetRows(rows = [], sectionKey, withTravel = false) {
  if (!rows.length) {
    return `<p class="muted">Nog geen regels.</p>`;
  }

  return rows
    .map((row, index) => {
      if (withTravel) {
        return `
          <div class="finance-line-row">
            <input class="finance-line-input" data-section="${sectionKey}" data-index="${index}" data-field="name" value="${esc(row.name || '')}" placeholder="Naam spreker" />
            <input class="finance-line-input" type="number" step="0.01" data-section="${sectionKey}" data-index="${index}" data-field="fee" value="${toBudgetNumber(
              row.fee
            )}" placeholder="Honorarium" />
            <input class="finance-line-input" type="number" step="0.01" data-section="${sectionKey}" data-index="${index}" data-field="travel" value="${toBudgetNumber(
              row.travel
            )}" placeholder="Reiskosten" />
            <button class="btn-ghost btn-sm" data-remove-section="${sectionKey}" data-index="${index}" type="button">✕</button>
          </div>
        `;
      }

      return `
        <div class="finance-line-row">
          <input class="finance-line-input" data-section="${sectionKey}" data-index="${index}" data-field="description" value="${esc(
            row.description || ''
          )}" placeholder="Omschrijving" />
          <input class="finance-line-input" type="number" step="0.01" data-section="${sectionKey}" data-index="${index}" data-field="amount" value="${toBudgetNumber(
            row.amount
          )}" placeholder="Bedrag" />
          <button class="btn-ghost btn-sm" data-remove-section="${sectionKey}" data-index="${index}" type="button">✕</button>
        </div>
      `;
    })
    .join('');
}

async function renderEventCateringBudgetTab(container, event) {
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  const [participants, items, lines] = await Promise.all([
    listParticipants(event.id).catch(() => []),
    listCateringItems({ brand_key: normalizeBrandForSettings(event.brand), includeInactive: false }).catch(() => []),
    listEventCatering(event.id).catch(() => []),
  ]);

  const participantCount = participants.length || Number(event.expected_attendance || event.capacity || 0) || 0;
  const totalCatering = lines.reduce((sum, line) => sum + toBudgetNumber(line.total_incl_vat), 0);
  const perParticipant = participantCount > 0 ? totalCatering / participantCount : null;

  container.innerHTML = `
    <div class="finance-summary-grid">
      <div class="card finance-summary-card">
        <h4>Totaal catering</h4>
        <strong>${esc(formatEuro(totalCatering))}</strong>
      </div>
      <div class="card finance-summary-card">
        <h4>Deelnemers</h4>
        <strong>${participantCount || 0}</strong>
      </div>
      <div class="card finance-summary-card">
        <h4>Kost per deelnemer</h4>
        <strong>${esc(perParticipant === null ? '-' : formatEuro(perParticipant))}</strong>
      </div>
    </div>

    <div class="card">
      <h4>Catering toevoegen</h4>
      <div class="finance-add-row">
        <select id="event-catering-item" class="filter-select">
          <option value="">Kies cateringoptie</option>
          ${items
            .map(
              (item) =>
                `<option value="${item.id}">${esc(item.name)} · ${esc(item.unit || 'per persoon')} · ${esc(formatEuro(item.unit_price))}</option>`
            )
            .join('')}
        </select>
        <input id="event-catering-quantity" class="filter-input" type="number" min="1" step="1" value="${participantCount || 1}" />
        <button id="event-catering-add" class="btn-primary">Toevoegen</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="event-table finance-table">
        <thead>
          <tr>
            <th>Optie</th>
            <th>Aantal</th>
            <th>Eenheidsprijs</th>
            <th>BTW</th>
            <th>Subtotaal excl.</th>
            <th>BTW bedrag</th>
            <th>Totaal incl.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${
            lines.length
              ? lines
                  .map(
                    (line) => `
                <tr>
                  <td>${esc(line.name || '-')}</td>
                  <td><input type="number" min="1" step="1" class="finance-inline-input" data-line-id="${line.id}" data-field="quantity" value="${line.quantity || 1}" /></td>
                  <td><input type="number" min="0" step="0.01" class="finance-inline-input" data-line-id="${line.id}" data-field="unit_price" value="${toBudgetNumber(
                    line.unit_price
                  )}" /></td>
                  <td><input type="number" min="0" step="0.01" class="finance-inline-input" data-line-id="${line.id}" data-field="vat_rate" value="${toBudgetNumber(
                    line.vat_rate
                  )}" /></td>
                  <td>${esc(formatEuro(line.subtotal_excl_vat || 0))}</td>
                  <td>${esc(formatEuro(line.vat_amount || 0))}</td>
                  <td><strong>${esc(formatEuro(line.total_incl_vat || 0))}</strong></td>
                  <td class="cp-ta-right"><button class="btn-ghost btn-sm" data-action="delete-catering-line" data-line-id="${line.id}">✕</button></td>
                </tr>
              `
                  )
                  .join('')
              : `<tr><td colspan="8" class="muted">Nog geen catering gekoppeld aan dit event.</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <div class="finance-actions">
      <button id="event-catering-save-all" class="btn-secondary">Wijzigingen opslaan</button>
      <button id="event-catering-refresh" class="btn-ghost">Vernieuwen</button>
    </div>
  `;

  container.querySelector('#event-catering-add')?.addEventListener('click', async () => {
    const itemId = container.querySelector('#event-catering-item')?.value || '';
    const quantity = Number.parseInt(container.querySelector('#event-catering-quantity')?.value || '1', 10) || 1;
    if (!itemId) {
      showToast('Kies eerst een cateringoptie.', 'error');
      return;
    }
    try {
      await saveEventCateringLine({
        event_id: event.id,
        catering_item_id: itemId,
        quantity,
      });
      showToast('Cateringregel toegevoegd.', 'success');
      await renderEventCateringBudgetTab(container, event);
    } catch (error) {
      showToast(`Toevoegen mislukt: ${error.message}`, 'error');
    }
  });

  container.querySelectorAll('[data-action="delete-catering-line"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const lineId = button.dataset.lineId;
      if (!lineId) return;
      if (!confirm('Cateringregel verwijderen?')) return;
      try {
        await deleteEventCatering(lineId);
        showToast('Cateringregel verwijderd.', 'success');
        await renderEventCateringBudgetTab(container, event);
      } catch (error) {
        showToast(`Verwijderen mislukt: ${error.message}`, 'error');
      }
    });
  });

  container.querySelector('#event-catering-save-all')?.addEventListener('click', async () => {
    const updates = [...container.querySelectorAll('.finance-inline-input[data-line-id]')].reduce((acc, input) => {
      const lineId = input.dataset.lineId;
      const field = input.dataset.field;
      if (!lineId || !field) return acc;
      if (!acc[lineId]) acc[lineId] = {};
      if (field === 'quantity') acc[lineId].quantity = Number.parseInt(input.value || '1', 10) || 1;
      if (field === 'unit_price') acc[lineId].unit_price_override = toBudgetNumber(input.value);
      if (field === 'vat_rate') acc[lineId].vat_rate = toBudgetNumber(input.value);
      return acc;
    }, {});

    try {
      await Promise.all(
        Object.entries(updates).map(([lineId, payload]) => {
          const original = lines.find((line) => String(line.id) === String(lineId));
          return saveEventCateringLine({
            id: lineId,
            event_id: event.id,
            catering_item_id: original?.catering_item_id,
            quantity: payload.quantity ?? original?.quantity ?? 1,
            unit_price_override:
              payload.unit_price_override !== undefined ? payload.unit_price_override : original?.unit_price,
            vat_rate: payload.vat_rate !== undefined ? payload.vat_rate : original?.vat_rate,
          });
        })
      );
      showToast('Cateringwijzigingen opgeslagen.', 'success');
      await renderEventCateringBudgetTab(container, event);
    } catch (error) {
      showToast(`Opslaan mislukt: ${error.message}`, 'error');
    }
  });

  container.querySelector('#event-catering-refresh')?.addEventListener('click', async () => {
    await renderEventCateringBudgetTab(container, event);
  });
}

async function renderEventFinancialOverviewTab(container, event) {
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  const [participants, cateringLines] = await Promise.all([
    listParticipants(event.id).catch(() => []),
    listEventCatering(event.id).catch(() => []),
  ]);
  const participantsCount = participants.length || Number(event.expected_attendance || event.capacity || 0) || 0;
  const cateringTotal = cateringLines.reduce((sum, line) => sum + toBudgetNumber(line.total_incl_vat), 0);
  let budget = null;
  try {
    budget = await getEventBudget(event.id, { participantsCount, cateringLines });
  } catch {
    budget = {
      location_cost: 0,
      speaker_costs: [],
      material_costs: [],
      marketing_costs: [],
      other_costs: [],
      ticket_price: 0,
      income_override: null,
      notes: '',
    };
  }

  const state = {
    location_cost: budget.location_cost || 0,
    speaker_costs: normalizeSpeakerCostRows(budget.speaker_costs || []),
    material_costs: normalizeGenericCostRows(budget.material_costs || []),
    marketing_costs: normalizeGenericCostRows(budget.marketing_costs || []),
    other_costs: normalizeGenericCostRows(budget.other_costs || []),
    ticket_price: budget.ticket_price || 0,
    income_override: budget.income_override ?? '',
    notes: budget.notes || '',
  };

  const renderView = () => {
    const totals = computeBudgetTotals(state, participantsCount, cateringTotal);

    container.innerHTML = `
      <div class="card finance-budget-card">
        <div class="finance-budget-head">
          <h4>Financieel overzicht</h4>
          <div class="finance-actions">
            <button class="btn-secondary" id="budget-save">Opslaan</button>
            <button class="btn-ghost" id="budget-print">Print / PDF</button>
          </div>
        </div>

        <div class="finance-budget-section">
          <h5>1. Locatiekost (forfait)</h5>
          <input class="finance-line-input" type="number" step="0.01" data-field="location_cost" value="${toBudgetNumber(
            state.location_cost
          )}" />
        </div>

        <div class="finance-budget-section">
          <h5>2. Cateringkost (automatisch)</h5>
          <p><strong>${esc(formatEuro(cateringTotal))}</strong> op basis van gekoppelde cateringlijnen.</p>
        </div>

        <div class="finance-budget-section">
          <div class="finance-section-title-row">
            <h5>3. Sprekerkosten</h5>
            <button class="btn-ghost btn-sm" data-add-section="speaker_costs" type="button">+ Regel</button>
          </div>
          ${renderBudgetRows(state.speaker_costs, 'speaker_costs', true)}
        </div>

        <div class="finance-budget-section">
          <div class="finance-section-title-row">
            <h5>4. Materiaalkosten</h5>
            <button class="btn-ghost btn-sm" data-add-section="material_costs" type="button">+ Regel</button>
          </div>
          ${renderBudgetRows(state.material_costs, 'material_costs')}
        </div>

        <div class="finance-budget-section">
          <div class="finance-section-title-row">
            <h5>5. Marketingkosten</h5>
            <button class="btn-ghost btn-sm" data-add-section="marketing_costs" type="button">+ Regel</button>
          </div>
          ${renderBudgetRows(state.marketing_costs, 'marketing_costs')}
        </div>

        <div class="finance-budget-section">
          <div class="finance-section-title-row">
            <h5>6. Overige kosten</h5>
            <button class="btn-ghost btn-sm" data-add-section="other_costs" type="button">+ Regel</button>
          </div>
          ${renderBudgetRows(state.other_costs, 'other_costs')}
        </div>

        <div class="finance-budget-section">
          <h5>7. Inkomsten / Ticketverkoop</h5>
          <div class="finance-line-row">
            <input class="finance-line-input" type="number" step="0.01" data-field="ticket_price" value="${toBudgetNumber(
              state.ticket_price
            )}" placeholder="Ticketprijs" />
            <input class="finance-line-input" type="number" step="0.01" data-field="income_override" value="${state.income_override}" placeholder="Forfait inkomst (optioneel)" />
          </div>
          <p class="muted">Deelnemers: ${participantsCount}</p>
        </div>

        <div class="finance-budget-section">
          <h5>Notities</h5>
          <textarea class="finance-notes" data-field="notes" rows="3">${esc(state.notes || '')}</textarea>
        </div>

        <div class="finance-total-grid">
          <div class="finance-total-item"><span>Totale kosten</span><strong>${esc(formatEuro(totals.totalCosts))}</strong></div>
          <div class="finance-total-item"><span>Totale inkomsten</span><strong>${esc(formatEuro(totals.totalIncome))}</strong></div>
          <div class="finance-total-item"><span>Netto resultaat</span><strong>${esc(formatEuro(totals.netResult))}</strong></div>
          <div class="finance-total-item"><span>Break-even deelnemers</span><strong>${esc(
            totals.breakEven === null ? '-' : totals.breakEven.toFixed(2)
          )}</strong></div>
          <div class="finance-total-item"><span>Kostprijs per deelnemer</span><strong>${esc(
            totals.costPerParticipant === null ? '-' : formatEuro(totals.costPerParticipant)
          )}</strong></div>
          <div class="finance-total-item"><span>Marge %</span><strong>${esc(
            totals.marginPercent === null ? '-' : `${totals.marginPercent.toFixed(1)}%`
          )}</strong></div>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-add-section]').forEach((button) => {
      button.addEventListener('click', () => {
        const section = button.dataset.addSection;
        if (!section || !Array.isArray(state[section])) return;
        if (section === 'speaker_costs') state[section].push({ name: '', fee: 0, travel: 0 });
        else state[section].push({ description: '', amount: 0 });
        renderView();
      });
    });

    container.querySelectorAll('[data-remove-section]').forEach((button) => {
      button.addEventListener('click', () => {
        const section = button.dataset.removeSection;
        const index = Number.parseInt(button.dataset.index || '-1', 10);
        if (!section || !Array.isArray(state[section]) || index < 0) return;
        state[section].splice(index, 1);
        renderView();
      });
    });

    container.querySelectorAll('[data-section][data-index][data-field]').forEach((input) => {
      input.addEventListener('input', () => {
        const section = input.dataset.section;
        const index = Number.parseInt(input.dataset.index || '-1', 10);
        const field = input.dataset.field;
        if (!section || !field || !Array.isArray(state[section]) || index < 0) return;
        const target = state[section][index] || {};
        target[field] = ['amount', 'fee', 'travel'].includes(field) ? toBudgetNumber(input.value) : input.value;
        state[section][index] = target;
      });
    });

    container.querySelectorAll('[data-field]:not([data-section])').forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        if (!field) return;
        if (field === 'notes') state.notes = input.value;
        if (field === 'ticket_price' || field === 'location_cost') state[field] = toBudgetNumber(input.value);
        if (field === 'income_override') state.income_override = input.value;
      });
    });

    container.querySelector('#budget-save')?.addEventListener('click', async () => {
      try {
        await saveEventBudget(event.id, {
          location_cost: state.location_cost,
          speaker_costs: state.speaker_costs,
          material_costs: state.material_costs,
          marketing_costs: state.marketing_costs,
          other_costs: state.other_costs,
          ticket_price: state.ticket_price,
          income_override: state.income_override === '' ? null : toBudgetNumber(state.income_override),
          notes: state.notes,
        });
        showToast('Eventbudget opgeslagen.', 'success');
        renderView();
      } catch (error) {
        showToast(`Opslaan mislukt: ${error.message}`, 'error');
      }
    });

    container.querySelector('#budget-print')?.addEventListener('click', () => {
      window.print();
    });
  };

  renderView();
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
              <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>Te doen</option>
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
        await runUiAction(async () => {
          await updateTask(t.id, { status: e.target.checked ? 'done' : 'todo' });
          renderList();
        }, 'Taakstatus bijwerken mislukt.');
      };
      card.querySelector('.t-status-sel').onchange = async (e) => {
        await runUiAction(async () => {
          await updateTask(t.id, { status: e.target.value });
          renderList();
        }, 'Taakstatus bijwerken mislukt.');
      };
      card.querySelector('.t-del-btn').onclick = async () => {
        if (!confirm('Taak verwijderen?')) return;
        await runUiAction(async () => {
          await deleteTask(t.id);
          showToast('Taak verwijderd.', 'success');
          renderList();
        }, 'Taak verwijderen mislukt.');
      };
      card.querySelectorAll('.st-check').forEach(cb => cb.onchange = async (e) => {
        await runUiAction(async () => {
          await updateSubtask(cb.dataset.id, { is_completed: e.target.checked });
          renderList();
        }, 'Subtaak bijwerken mislukt.');
      });
      card.querySelectorAll('.st-del-btn').forEach(btn => btn.onclick = async () => {
        await runUiAction(async () => {
          await deleteSubtask(btn.dataset.id);
          renderList();
        }, 'Subtaak verwijderen mislukt.');
      });
      card.querySelector('.st-add-btn').onclick = async () => {
        const val = card.querySelector('.st-input').value.trim();
        if (!val) return;
        await runUiAction(async () => {
          await createSubtask({ task_id: t.id, title: val, is_completed: false });
          renderList();
        }, 'Subtaak toevoegen mislukt.');
      };

      listArea.appendChild(card);
    });
  };

  renderList();

  container.querySelector('#tn-add').onclick = async () => {
    const title = container.querySelector('#tn-title').value.trim();
    if (!title) return;
    await runUiAction(async () => {
      await createTask({
        event_id: eventId,
        title,
        due_at: container.querySelector('#tn-due').value || null,
        priority: container.querySelector('#tn-prio').value,
        assignee_user_id: container.querySelector('#tn-assign').value || null,
        status: 'todo'
      });
      showToast('Taak toegevoegd.', 'success');
      container.querySelector('#tn-title').value = '';
      renderList();
    }, 'Taak toevoegen mislukt.');
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
      await runUiAction(async () => {
        await deleteAttachment(btn.dataset.id);
        showToast('Bijlage verwijderd.', 'success');
        renderAttachmentsTab(container, eventId);
      }, 'Bijlage verwijderen mislukt.');
    }
  });

  container.querySelector('#an-add').onclick = async () => {
    const url = container.querySelector('#an-url').value.trim();
    const title = container.querySelector('#an-title').value.trim();
    if (!url) {
      showToast('URL is verplicht.', 'error');
      return;
    }
    await runUiAction(async () => {
      const user = getCurrentAppUser();

      await addAttachment({
        event_id: eventId,
        user_id: user?.id,
        title: title || 'Naamloos',
        url,
        file_type: container.querySelector('#an-type').value
      });
      showToast('Bijlage toegevoegd.', 'success');
      renderAttachmentsTab(container, eventId);
    }, 'Bijlage toevoegen mislukt.');
  };
}
