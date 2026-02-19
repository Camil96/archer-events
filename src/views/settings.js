import { supabase } from "../supabaseClient.js";
import {
  SUPABASE_URL,
  getBrandTheme,
  getBrandLogoIcon,
  getBrandLogoWordmark,
} from "../config.js";
import { importEventCatalog2026, store } from "../store.js";
import { esc, showToast } from "../utils.js";

const BRANDS = [
  {
    id: "academy",
    key: "archer_academy",
    label: "Archer Academy",
    fallbackColor: getBrandTheme("archer_academy").color,
    fallbackEmail: "events@archer.finance",
  },
  {
    id: "invest",
    key: "archer_invest",
    label: "Archer Invest",
    fallbackColor: getBrandTheme("archer_invest").color,
    fallbackEmail: "events@archer.finance",
  },
  {
    id: "fund",
    key: "archer_fund",
    label: "Archer Fund",
    fallbackColor: getBrandTheme("archer_fund").color,
    fallbackEmail: "events@archer.finance",
  },
];

const SECTION_DEFS = [
  { id: "organisatie", icon: "◈", label: "Organisatie", description: "Merken, branding en basisinstellingen." },
  { id: "locaties", icon: "▣", label: "Locaties", description: "Venue setup, capaciteit en faciliteiten." },
  { id: "programmas", icon: "◉", label: "Programma's", description: "Programma-categorieen en status per merk." },
  { id: "event-types", icon: "◎", label: "Event types", description: "Type templates met defaults voor operations." },
  { id: "sessies", icon: "◷", label: "Sessies & slots", description: "Standaard timeslots voor planning." },
  { id: "gebruikers", icon: "◯", label: "Gebruikers", description: "Rollen, merktoewijzing en toegang." },
  { id: "notificaties", icon: "◬", label: "Notificaties", description: "E-mailtriggers en templatebeheer." },
  { id: "catering", icon: "◫", label: "Catering", description: "Catering catalogus voor event teams." },
  { id: "export", icon: "◳", label: "Export & integraties", description: "CSV defaults, webhooks en API keys." },
  { id: "auditlog", icon: "◱", label: "Audit log", description: "Traceer kritieke wijzigingen." },
];

const FACILITY_OPTIONS = ["WiFi", "Catering", "Parking", "AV-installatie", "Livestream", "Kleedkamers"];

const NOTIFICATION_TRIGGERS = [
  { key: "invite", label: "Uitnodiging deelnemer" },
  { key: "rsvp", label: "Bevestiging na RSVP" },
  { key: "reminder", label: "Herinnering (X dagen voor event)" },
  { key: "checkin", label: "Check-in bevestiging" },
  { key: "followup", label: "Follow-up na event" },
];

const DEFAULT_EVENT_TITLE_PRESETS = [
  "Performance sessie",
  "Kick-off",
  "Masterclass",
  "Netwerkevent",
  "Workshop",
  "1-op-1 Sessie",
].join(", ");

const DEFAULT_PHYSICAL_LOCATION_PRESETS = ["Aula Archer", "Seneca", "Kantoor Archer"].join(", ");

const DEFAULT_ONLINE_LOCATION_PRESETS = [
  "Zoom meeting|Online - Zoom|https://zoom.us/j/",
  "Microsoft Teams|Online - Teams|https://teams.microsoft.com/l/meetup-join/",
  "Google Meet|Online - Google Meet|https://meet.google.com/",
].join("\n");

const EXPORT_FIELDS = [
  "title",
  "location",
  "event_date",
  "start_at",
  "end_at",
  "capacity",
  "program",
  "participant_group",
  "catering",
  "status",
];

const BRAND_IDS = BRANDS.map((b) => b.id);

const state = {
  root: null,
  contentEl: null,
  activeSection: "organisatie",
  currentBrand: store.brandId || "academy",
  loadToken: 0,
};

const SECTION_RENDERERS = {
  organisatie: renderOrganisatieSection,
  locaties: renderLocatiesSection,
  programmas: renderProgrammasSection,
  "event-types": renderEventTypesSection,
  sessies: renderSessiesSection,
  gebruikers: renderGebruikersSection,
  notificaties: renderNotificatiesSection,
  catering: renderCateringSection,
  export: renderExportSection,
  auditlog: renderAuditLogSection,
};

export async function renderSettings(container) {
  const root = container || document.getElementById("page-body");
  if (!root) throw new Error("Settings container niet gevonden.");

  state.root = root;
  state.currentBrand = store.brandId || state.currentBrand || BRANDS[0].id;

  renderShell();
  bindShellEvents();
  await loadSection(state.activeSection);
}

function renderShell() {
  const shellBrandKey = getThemeBrandKey(state.currentBrand);
  const shellIcon = getBrandLogoIcon(shellBrandKey);
  const shellWordmark = getBrandLogoWordmark(shellBrandKey);

  state.root.innerHTML = `
    <section class="cp-shell" data-brand-theme="${esc(shellBrandKey)}">
      <aside class="cp-nav" aria-label="Instellingen secties">
        <div class="cp-nav-head">
          <div class="cp-brand-lockup">
            <img class="cp-brand-icon" src="${esc(shellIcon)}" alt="" aria-hidden="true" onerror="this.style.display='none'">
            <img class="cp-brand-logo" src="${esc(shellWordmark)}" alt="Archer" onerror="this.style.display='none'">
          </div>
          <p class="cp-eyebrow">Archer Events</p>
          <h2>Control Panel</h2>
          <p>Hospitality operations setup voor teams, locaties en workflows.</p>
        </div>
        <nav class="cp-nav-list">
          ${SECTION_DEFS.map(
            (section) => `
            <button class="cp-nav-item ${section.id === state.activeSection ? "active" : ""}" data-section="${section.id}">
              <span class="cp-nav-icon">${section.icon}</span>
              <span>
                <strong>${section.label}</strong>
                <small>${section.description}</small>
              </span>
            </button>
          `
          ).join("")}
        </nav>
      </aside>

      <div class="cp-main">
        <header class="cp-main-head">
          <div>
            <p class="cp-eyebrow">Instellingen</p>
            <h1>Archer Hospitality Control Panel</h1>
            <p>Centraal beheer voor event planning, deelnemerservaring en operationele standaarden.</p>
          </div>
          <div class="cp-main-head-actions">
            <label class="cp-inline-field">
              <span>Merkcontext</span>
              <select id="cp-brand-switch">
                ${BRANDS.map(
                  (brand) =>
                    `<option value="${brand.id}" ${brand.id === state.currentBrand ? "selected" : ""}>${brand.label}</option>`
                ).join("")}
              </select>
            </label>
            <button class="cp-btn cp-btn-ghost" id="cp-refresh-section" type="button">Vernieuwen</button>
          </div>
        </header>

        <div id="cp-section-content" class="cp-section-content">
          ${renderLoading("Sectie laden...")}
        </div>
      </div>
    </section>
  `;

  state.contentEl = state.root.querySelector("#cp-section-content");
}

function bindShellEvents() {
  state.root.querySelectorAll(".cp-nav-item").forEach((btn) => {
    btn.onclick = async () => {
      const sectionId = btn.dataset.section;
      if (!sectionId || sectionId === state.activeSection) return;
      state.activeSection = sectionId;
      syncActiveNavigation();
      await loadSection(sectionId);
    };
  });

  const brandSelect = state.root.querySelector("#cp-brand-switch");
  brandSelect.onchange = async () => {
    state.currentBrand = brandSelect.value;
    store.brandId = state.currentBrand;
    syncShellTheme();
    await loadSection(state.activeSection);
  };

  state.root.querySelector("#cp-refresh-section").onclick = async () => {
    await loadSection(state.activeSection);
  };
}

function syncActiveNavigation() {
  state.root.querySelectorAll(".cp-nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === state.activeSection);
  });
}

function syncShellTheme() {
  const shell = state.root?.querySelector(".cp-shell");
  if (!shell) return;

  const brandKey = getThemeBrandKey(state.currentBrand);
  shell.dataset.brandTheme = brandKey;

  const icon = state.root.querySelector(".cp-brand-icon");
  const wordmark = state.root.querySelector(".cp-brand-logo");
  if (icon) icon.src = getBrandLogoIcon(brandKey);
  if (wordmark) wordmark.src = getBrandLogoWordmark(brandKey);
}

async function loadSection(sectionId) {
  const renderer = SECTION_RENDERERS[sectionId];
  if (!renderer) {
    state.contentEl.innerHTML = renderError(`Onbekende sectie: ${esc(sectionId)}`);
    return;
  }

  const token = ++state.loadToken;
  state.contentEl.innerHTML = renderLoading("Data ophalen...");

  try {
    await renderer(state.contentEl);
    if (token !== state.loadToken) return;
  } catch (error) {
    if (token !== state.loadToken) return;
    state.contentEl.innerHTML = renderError(error.message || "Onbekende fout");
  }
}

async function renderOrganisatieSection(container) {
  const [settingsRows, locations] = await Promise.all([
    fetchAppSettings(BRAND_IDS),
    fetchRows("locations", { columns: "id,name,city,is_active", orderBy: "name" }),
  ]);

  const locationOptions = (locations || []).filter((location) => location.is_active !== false);
  const bookingTitlePresets = getSetting(
    settingsRows,
    state.currentBrand,
    "event_title_presets",
    DEFAULT_EVENT_TITLE_PRESETS
  );
  const bookingPhysicalPresets = getSetting(
    settingsRows,
    state.currentBrand,
    "physical_location_presets",
    DEFAULT_PHYSICAL_LOCATION_PRESETS
  );
  const bookingOnlinePresets = getSetting(
    settingsRows,
    state.currentBrand,
    "online_location_presets",
    DEFAULT_ONLINE_LOCATION_PRESETS
  );

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Organisatie",
      description:
        "Beheer de merken van Archer met branding, contactgegevens en standaardlocaties voor hospitality operaties.",
      sideInfo: `Actief merk in paneel: <strong>${esc(getBrandLabel(state.currentBrand))}</strong>`,
    })}

    <div class="cp-stack">
      ${BRANDS.map((brand) => {
        const brandName = getSetting(settingsRows, brand.id, "brand_name", brand.label);
        const contactEmail = getSetting(settingsRows, brand.id, "contact_email", brand.fallbackEmail);
        const accentColor = getSetting(settingsRows, brand.id, "accent_color", brand.fallbackColor);
        const defaultLocationId = getSetting(settingsRows, brand.id, "default_location_id", "");
        const logoUrl = getSetting(settingsRows, brand.id, "logo_url", "");

        return `
          <article class="cp-card cp-brand-card" data-brand-id="${brand.id}">
            <header class="cp-card-head">
              <div class="cp-card-title-wrap">
                <span class="cp-color-bullet" style="background:${esc(accentColor)}"></span>
                <div>
                  <h3>${esc(brand.label)}</h3>
                  <p>Merk ID: <code>${esc(brand.id)}</code></p>
                </div>
              </div>
              <button class="cp-btn cp-btn-primary" data-action="save-brand" type="button">Opslaan</button>
            </header>

            <div class="cp-grid cp-grid-2">
              <label class="cp-field">
                <span>Naam</span>
                <input type="text" data-field="brand_name" value="${esc(brandName)}" placeholder="Merknaam" />
              </label>

              <label class="cp-field">
                <span>Contact e-mail</span>
                <input type="email" data-field="contact_email" value="${esc(contactEmail)}" placeholder="events@archer.finance" />
              </label>

              <label class="cp-field">
                <span>Primaire kleur</span>
                <div class="cp-inline-input-row">
                  <input type="color" data-field="accent_color_picker" value="${esc(accentColor)}" />
                  <input type="text" data-field="accent_color" value="${esc(accentColor)}" placeholder="#4d73ff" />
                </div>
              </label>

              <label class="cp-field">
                <span>Standaardlocatie</span>
                <select data-field="default_location_id">
                  <option value="">Geen standaardlocatie</option>
                  ${locationOptions
                    .map(
                      (location) =>
                        `<option value="${esc(location.id)}" ${String(location.id) === String(defaultLocationId) ? "selected" : ""}>${esc(
                          `${location.name}${location.city ? ` - ${location.city}` : ""}`
                        )}</option>`
                    )
                    .join("")}
                </select>
              </label>

              <label class="cp-field cp-col-span-2">
                <span>Logo URL</span>
                <input type="url" data-field="logo_url" value="${esc(logoUrl)}" placeholder="https://..." />
              </label>
            </div>
          </article>
        `;
      }).join("")}

      <article class="cp-card">
        <header class="cp-card-head">
          <div>
            <h3>Booking presets (${esc(getBrandLabel(state.currentBrand))})</h3>
            <p>Deze presets worden gebruikt in het <strong>Nieuw Event</strong> scherm zodat alles centraal gestuurd is.</p>
          </div>
          <button class="cp-btn cp-btn-primary" id="cp-save-booking-presets" type="button">Presets opslaan</button>
        </header>

        <div class="cp-grid cp-grid-2">
          <label class="cp-field cp-col-span-2">
            <span>Veelgebruikte evenement titels (comma-separated)</span>
            <textarea id="cp-event-title-presets" rows="2" placeholder="Performance sessie, Kick-off, Masterclass">${esc(
              bookingTitlePresets
            )}</textarea>
          </label>

          <label class="cp-field cp-col-span-2">
            <span>Fysieke locatiepresets (comma-separated)</span>
            <textarea id="cp-physical-location-presets" rows="2" placeholder="Aula Archer, Seneca, Kantoor Archer">${esc(
              bookingPhysicalPresets
            )}</textarea>
          </label>

          <label class="cp-field cp-col-span-2">
            <span>Online locatiepresets (1 per lijn: label|locatie|url)</span>
            <textarea id="cp-online-location-presets" rows="4" placeholder="Zoom meeting|Online - Zoom|https://zoom.us/j/">${esc(
              bookingOnlinePresets
            )}</textarea>
          </label>
        </div>
      </article>

      <article class="cp-card">
        <header class="cp-card-head">
          <div>
            <h3>Eventkalender 2026 import</h3>
            <p>
              Laad de aangeleverde events uit de planning in zonder duplicaten. Brandmapping:
              <strong> Forex workshop = Academy + Invest</strong>,
              <strong> Investor Introduction = Fund</strong>,
              <strong> Mastermind/Masterclass = Invest</strong>.
            </p>
          </div>
          <button class="cp-btn cp-btn-primary" id="cp-import-event-catalog" type="button">Importeer events</button>
        </header>
        <p class="cp-hint">
          Gebruikt een dedupe-check op titel + startmoment. Bestaande events blijven ongewijzigd.
        </p>
      </article>
    </div>
  `;

  container.querySelectorAll("[data-action='save-brand']").forEach((btn) => {
    btn.onclick = async () => {
      const card = btn.closest(".cp-brand-card");
      const brandId = card.dataset.brandId;

      const pairs = [
        ["brand_name", readInputValue(card, "brand_name")],
        ["contact_email", readInputValue(card, "contact_email")],
        ["accent_color", readInputValue(card, "accent_color") || "#4d73ff"],
        ["default_location_id", readInputValue(card, "default_location_id")],
        ["logo_url", readInputValue(card, "logo_url")],
      ];

      const error = await upsertSettings(brandId, pairs);
      if (error) {
        showToast(`Fout bij opslaan: ${error.message}`, "error");
        return;
      }

      showToast(`Instellingen opgeslagen voor ${getBrandLabel(brandId)}.`, "success");
      await loadSection("organisatie");
    };
  });

  container.querySelectorAll(".cp-brand-card").forEach((card) => {
    const colorInput = card.querySelector("[data-field='accent_color']");
    const colorPicker = card.querySelector("[data-field='accent_color_picker']");
    colorPicker.oninput = () => {
      colorInput.value = colorPicker.value;
    };
    colorInput.oninput = () => {
      if (/^#[0-9a-fA-F]{6}$/.test(colorInput.value.trim())) colorPicker.value = colorInput.value.trim();
    };
  });

  container.querySelector("#cp-save-booking-presets").onclick = async () => {
    const brandId = state.currentBrand;
    const error = await upsertSettings(brandId, [
      ["event_title_presets", container.querySelector("#cp-event-title-presets").value.trim()],
      ["physical_location_presets", container.querySelector("#cp-physical-location-presets").value.trim()],
      ["online_location_presets", container.querySelector("#cp-online-location-presets").value.trim()],
    ]);

    if (error) {
      showToast(`Presets opslaan mislukt: ${error.message}`, "error");
      return;
    }

    showToast(`Booking presets opgeslagen voor ${getBrandLabel(brandId)}.`, "success");
  };

  const importButton = container.querySelector("#cp-import-event-catalog");
  importButton.onclick = async () => {
    importButton.disabled = true;
    importButton.textContent = "Importeren...";

    try {
      const result = await importEventCatalog2026();
      const invalidText = result.invalid ? `, ${result.invalid} ongeldig` : "";
      showToast(
        `Import voltooid: ${result.inserted} toegevoegd, ${result.skipped} overgeslagen, ${result.corrected || 0} gecorrigeerd${invalidText}.`,
        "success"
      );
    } catch (error) {
      showToast(`Import mislukt: ${error.message}`, "error");
    } finally {
      importButton.disabled = false;
      importButton.textContent = "Importeer events";
    }
  };
}

async function renderLocatiesSection(container) {
  const locations = await fetchRows("locations", { brandScoped: true, orderBy: "name" });

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Locaties",
      description:
        "Beheer alle fysieke locaties waar events plaatsvinden. Deactiveren bewaart historische data voor rapportering.",
      actions: `<button class="cp-btn cp-btn-primary" id="cp-add-location" type="button">+ Locatie toevoegen</button>`,
    })}

    ${locations.length
      ? `
      <div class="cp-table-card">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Locatie</th>
              <th>Adres</th>
              <th>Capaciteit</th>
              <th>Faciliteiten</th>
              <th>Status</th>
              <th class="cp-ta-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            ${locations
              .map((location) => {
                const facilities = ensureArray(location.facilities);
                const address = [location.address, location.postal_code, location.city, location.country].filter(Boolean).join(", ");
                return `
                  <tr>
                    <td>
                      <strong>${esc(location.name || "-")}</strong>
                      <small>${esc(location.brand || state.currentBrand)}</small>
                    </td>
                    <td>${esc(address || "-")}</td>
                    <td>${location.capacity || "-"}</td>
                    <td>${renderTagList(facilities, 3)}</td>
                    <td>${renderStatusBadge(location.is_active !== false)}</td>
                    <td class="cp-ta-right">
                      <div class="cp-row-actions">
                        <button class="cp-btn-link" data-action="edit-location" data-id="${location.id}" type="button">Bewerken</button>
                        <button class="cp-btn-link" data-action="toggle-location" data-id="${location.id}" data-active="${String(
                          location.is_active !== false
                        )}" type="button">${location.is_active !== false ? "Deactiveren" : "Activeren"}</button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : renderEmptyState("Nog geen locaties", "Voeg de eerste locatie toe zodat teams events kunnen plannen.")}
  `;

  container.querySelector("#cp-add-location").onclick = () => openLocationModal(null);

  container.querySelectorAll("[data-action='edit-location']").forEach((btn) => {
    btn.onclick = () => {
      const location = locations.find((entry) => String(entry.id) === String(btn.dataset.id));
      if (location) openLocationModal(location);
    };
  });

  container.querySelectorAll("[data-action='toggle-location']").forEach((btn) => {
    btn.onclick = async () => {
      const isActive = btn.dataset.active === "true";
      const { error } = await saveRecord({
        table: "locations",
        id: btn.dataset.id,
        payload: { is_active: !isActive },
        optionalColumns: ["is_active"],
      });

      if (error) {
        showToast(`Status kon niet worden aangepast: ${error.message}`, "error");
        return;
      }

      showToast("Locatiestatus bijgewerkt.", "success");
      await loadSection("locaties");
    };
  });
}

function openLocationModal(location) {
  const isEdit = !!location;
  const selectedFacilities = ensureArray(location?.facilities);

  openModal({
    title: isEdit ? "Locatie bewerken" : "Nieuwe locatie",
    description: "Vastleggen van venue data voor planning, operationele checklists en capaciteit.",
    saveLabel: isEdit ? "Opslaan" : "Aanmaken",
    body: `
      <div class="cp-grid cp-grid-2">
        <label class="cp-field cp-col-span-2">
          <span>Naam</span>
          <input id="cp-loc-name" type="text" value="${esc(location?.name || "")}" placeholder="Archer HQ" />
        </label>

        <label class="cp-field">
          <span>Adres</span>
          <input id="cp-loc-address" type="text" value="${esc(location?.address || "")}" placeholder="Straat + nummer" />
        </label>

        <label class="cp-field">
          <span>Stad</span>
          <input id="cp-loc-city" type="text" value="${esc(location?.city || "")}" placeholder="Brussel" />
        </label>

        <label class="cp-field">
          <span>Postcode</span>
          <input id="cp-loc-postal" type="text" value="${esc(location?.postal_code || "")}" placeholder="1000" />
        </label>

        <label class="cp-field">
          <span>Land</span>
          <input id="cp-loc-country" type="text" value="${esc(location?.country || "Belgie")}" placeholder="Belgie" />
        </label>

        <label class="cp-field">
          <span>Capaciteit (max personen)</span>
          <input id="cp-loc-capacity" type="number" min="0" value="${location?.capacity ?? ""}" />
        </label>

        <label class="cp-field cp-col-span-2">
          <span>Notities</span>
          <textarea id="cp-loc-notes" rows="3" placeholder="Operationele opmerkingen, toegangsinstructies, ...">${esc(
            location?.notes || ""
          )}</textarea>
        </label>

        <div class="cp-field cp-col-span-2">
          <span>Faciliteiten</span>
          <div class="cp-chip-check-wrap">
            ${FACILITY_OPTIONS.map(
              (facility) => `
              <label class="cp-chip-check">
                <input type="checkbox" value="${facility}" ${selectedFacilities.includes(facility) ? "checked" : ""} />
                <span>${facility}</span>
              </label>
            `
            ).join("")}
          </div>
        </div>

        <label class="cp-field cp-col-span-2 cp-toggle-field">
          <span>Actief</span>
          <input id="cp-loc-active" type="checkbox" ${location?.is_active !== false ? "checked" : ""} />
        </label>
      </div>
    `,
    onSave: async (overlay) => {
      const name = overlay.querySelector("#cp-loc-name").value.trim();
      if (!name) {
        showToast("Naam is verplicht.", "error");
        return false;
      }

      const payload = {
        brand: state.currentBrand,
        name,
        address: overlay.querySelector("#cp-loc-address").value.trim(),
        city: overlay.querySelector("#cp-loc-city").value.trim(),
        postal_code: overlay.querySelector("#cp-loc-postal").value.trim(),
        country: overlay.querySelector("#cp-loc-country").value.trim(),
        capacity: parseNullableInt(overlay.querySelector("#cp-loc-capacity").value),
        notes: overlay.querySelector("#cp-loc-notes").value.trim(),
        facilities: [...overlay.querySelectorAll(".cp-chip-check input:checked")].map((entry) => entry.value),
        is_active: overlay.querySelector("#cp-loc-active").checked,
      };

      const { error } = await saveRecord({
        table: "locations",
        id: location?.id,
        payload,
        optionalColumns: ["brand", "country", "is_active"],
      });

      if (error) {
        showToast(`Opslaan mislukt: ${error.message}`, "error");
        return false;
      }

      showToast(isEdit ? "Locatie bijgewerkt." : "Locatie aangemaakt.", "success");
      await loadSection("locaties");
      return true;
    },
  });
}

async function renderProgrammasSection(container) {
  const programs = await fetchRows("programs", { brandScoped: true, orderBy: "name" });

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Programma's",
      description:
        "Configureer programma-categorieen (mentorship, workshop, masterclass, ...) per merkcontext.",
      actions: `<button class="cp-btn cp-btn-primary" id="cp-add-program" type="button">+ Programma toevoegen</button>`,
    })}

    ${programs.length
      ? `
      <div class="cp-table-card">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Beschrijving</th>
              <th>Merk</th>
              <th>Status</th>
              <th class="cp-ta-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            ${programs
              .map(
                (program) => `
              <tr>
                <td><strong>${esc(program.name || "-")}</strong></td>
                <td>${esc(program.description || "-")}</td>
                <td>${esc(getBrandLabel(program.brand || state.currentBrand))}</td>
                <td>${renderStatusBadge(program.is_active !== false)}</td>
                <td class="cp-ta-right">
                  <div class="cp-row-actions">
                    <button class="cp-btn-link" data-action="edit-program" data-id="${program.id}" type="button">Bewerken</button>
                    <button class="cp-btn-link" data-action="toggle-program" data-id="${program.id}" data-active="${String(
                      program.is_active !== false
                    )}" type="button">${program.is_active !== false ? "Deactiveren" : "Activeren"}</button>
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : renderEmptyState("Geen programma's", "Voeg categorieen toe om events consistenter op te zetten.")}
  `;

  container.querySelector("#cp-add-program").onclick = () => openProgramModal(null);

  container.querySelectorAll("[data-action='edit-program']").forEach((btn) => {
    btn.onclick = () => {
      const program = programs.find((entry) => String(entry.id) === String(btn.dataset.id));
      if (program) openProgramModal(program);
    };
  });

  container.querySelectorAll("[data-action='toggle-program']").forEach((btn) => {
    btn.onclick = async () => {
      const isActive = btn.dataset.active === "true";
      const { error } = await saveRecord({
        table: "programs",
        id: btn.dataset.id,
        payload: { is_active: !isActive },
        optionalColumns: ["is_active"],
      });

      if (error) {
        showToast(`Statusupdate mislukt: ${error.message}`, "error");
        return;
      }

      showToast("Programmastatus bijgewerkt.", "success");
      await loadSection("programmas");
    };
  });
}

function openProgramModal(program) {
  const isEdit = !!program;

  openModal({
    title: isEdit ? "Programma bewerken" : "Nieuw programma",
    description: "Gebruik duidelijke categorieen zodat operationele rapporten en planning uniform blijven.",
    saveLabel: isEdit ? "Opslaan" : "Aanmaken",
    body: `
      <div class="cp-grid cp-grid-2">
        <label class="cp-field cp-col-span-2">
          <span>Naam</span>
          <input id="cp-program-name" type="text" value="${esc(program?.name || "")}" placeholder="Masterclass" />
        </label>

        <label class="cp-field cp-col-span-2">
          <span>Beschrijving</span>
          <textarea id="cp-program-description" rows="3" placeholder="Context en doel van dit programma">${esc(
            program?.description || ""
          )}</textarea>
        </label>

        <label class="cp-field">
          <span>Merk</span>
          <select id="cp-program-brand">
            ${renderBrandOptions(program?.brand || state.currentBrand)}
          </select>
        </label>

        <label class="cp-field cp-toggle-field">
          <span>Actief</span>
          <input id="cp-program-active" type="checkbox" ${program?.is_active !== false ? "checked" : ""} />
        </label>
      </div>
    `,
    onSave: async (overlay) => {
      const name = overlay.querySelector("#cp-program-name").value.trim();
      if (!name) {
        showToast("Naam is verplicht.", "error");
        return false;
      }

      const payload = {
        brand: overlay.querySelector("#cp-program-brand").value,
        name,
        description: overlay.querySelector("#cp-program-description").value.trim(),
        is_active: overlay.querySelector("#cp-program-active").checked,
      };

      const { error } = await saveRecord({
        table: "programs",
        id: program?.id,
        payload,
        optionalColumns: ["is_active", "brand"],
      });

      if (error) {
        showToast(`Opslaan mislukt: ${error.message}`, "error");
        return false;
      }

      showToast("Programma opgeslagen.", "success");
      await loadSection("programmas");
      return true;
    },
  });
}

async function renderEventTypesSection(container) {
  const types = await fetchRows("event_types", { brandScoped: true, orderBy: "name" });

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Event types",
      description:
        "Stel eventtype defaults in zoals badgekleur, capaciteit en standaard catering, vergelijkbaar met PMS templates.",
      actions: `<button class="cp-btn cp-btn-primary" id="cp-add-event-type" type="button">+ Event type toevoegen</button>`,
    })}

    ${types.length
      ? `
      <div class="cp-table-card">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Kleur</th>
              <th>Standaard capaciteit</th>
              <th>Standaard catering</th>
              <th>Status</th>
              <th class="cp-ta-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            ${types
              .map(
                (eventType) => `
              <tr>
                <td>
                  <strong>${esc(eventType.name || "-")}</strong>
                  <small>${esc(eventType.description || "")}</small>
                </td>
                <td>
                  <span class="cp-color-bullet-square" style="background:${esc(eventType.color || "#4d73ff")}"></span>
                  ${esc(eventType.color || "#4d73ff")}
                </td>
                <td>${eventType.default_capacity || "-"}</td>
                <td>${esc(eventType.default_catering || "-")}</td>
                <td>${renderStatusBadge(eventType.is_active !== false)}</td>
                <td class="cp-ta-right">
                  <div class="cp-row-actions">
                    <button class="cp-btn-link" data-action="edit-event-type" data-id="${eventType.id}" type="button">Bewerken</button>
                    <button class="cp-btn-link" data-action="toggle-event-type" data-id="${eventType.id}" data-active="${String(
                      eventType.is_active !== false
                    )}" type="button">${eventType.is_active !== false ? "Deactiveren" : "Activeren"}</button>
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : renderEmptyState("Geen event types", "Voeg templates toe voor consistente setup van events.")}
  `;

  container.querySelector("#cp-add-event-type").onclick = () => openEventTypeModal(null);

  container.querySelectorAll("[data-action='edit-event-type']").forEach((btn) => {
    btn.onclick = () => {
      const eventType = types.find((entry) => String(entry.id) === String(btn.dataset.id));
      if (eventType) openEventTypeModal(eventType);
    };
  });

  container.querySelectorAll("[data-action='toggle-event-type']").forEach((btn) => {
    btn.onclick = async () => {
      const isActive = btn.dataset.active === "true";
      const { error } = await saveRecord({
        table: "event_types",
        id: btn.dataset.id,
        payload: { is_active: !isActive },
        optionalColumns: ["is_active"],
      });

      if (error) {
        showToast(`Statusupdate mislukt: ${error.message}`, "error");
        return;
      }

      showToast("Event type status bijgewerkt.", "success");
      await loadSection("event-types");
    };
  });
}

function openEventTypeModal(eventType) {
  const isEdit = !!eventType;

  const overlay = openModal({
    title: isEdit ? "Event type bewerken" : "Nieuw event type",
    description: "Templates versnellen eventcreatie en zorgen voor consistente servicekwaliteit.",
    saveLabel: isEdit ? "Opslaan" : "Aanmaken",
    body: `
      <div class="cp-grid cp-grid-2">
        <label class="cp-field">
          <span>Naam</span>
          <input id="cp-et-name" type="text" value="${esc(eventType?.name || "")}" placeholder="Kickoff" />
        </label>

        <label class="cp-field">
          <span>Merk</span>
          <select id="cp-et-brand">
            ${renderBrandOptions(eventType?.brand || state.currentBrand)}
          </select>
        </label>

        <label class="cp-field">
          <span>Kleur</span>
          <div class="cp-inline-input-row">
            <input id="cp-et-color-picker" type="color" value="${esc(eventType?.color || "#4d73ff")}" />
            <input id="cp-et-color" type="text" value="${esc(eventType?.color || "#4d73ff")}" placeholder="#4d73ff" />
          </div>
        </label>

        <label class="cp-field">
          <span>Standaard capaciteit</span>
          <input id="cp-et-capacity" type="number" min="0" value="${eventType?.default_capacity ?? ""}" />
        </label>

        <label class="cp-field cp-col-span-2">
          <span>Standaard catering</span>
          <input id="cp-et-catering" type="text" value="${esc(eventType?.default_catering || "")}" placeholder="Drank + lunch" />
        </label>

        <label class="cp-field cp-col-span-2">
          <span>Beschrijving</span>
          <textarea id="cp-et-description" rows="3" placeholder="Wanneer dit type gebruikt wordt">${esc(
            eventType?.description || ""
          )}</textarea>
        </label>

        <label class="cp-field cp-toggle-field cp-col-span-2">
          <span>Actief</span>
          <input id="cp-et-active" type="checkbox" ${eventType?.is_active !== false ? "checked" : ""} />
        </label>
      </div>
    `,
    onSave: async (overlay) => {
      const name = overlay.querySelector("#cp-et-name").value.trim();
      if (!name) {
        showToast("Naam is verplicht.", "error");
        return false;
      }

      const payload = {
        brand: overlay.querySelector("#cp-et-brand").value,
        name,
        color: overlay.querySelector("#cp-et-color").value.trim() || "#4d73ff",
        default_capacity: parseNullableInt(overlay.querySelector("#cp-et-capacity").value),
        default_catering: overlay.querySelector("#cp-et-catering").value.trim(),
        description: overlay.querySelector("#cp-et-description").value.trim(),
        is_active: overlay.querySelector("#cp-et-active").checked,
      };

      const { error } = await saveRecord({
        table: "event_types",
        id: eventType?.id,
        payload,
        optionalColumns: ["description", "is_active", "brand"],
      });

      if (error) {
        showToast(`Opslaan mislukt: ${error.message}`, "error");
        return false;
      }

      showToast("Event type opgeslagen.", "success");
      await loadSection("event-types");
      return true;
    },
  });

  if (!overlay) return;

  const picker = overlay.querySelector("#cp-et-color-picker");
  const input = overlay.querySelector("#cp-et-color");

  picker.oninput = () => {
    input.value = picker.value;
  };

  input.oninput = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(input.value.trim())) picker.value = input.value.trim();
  };
}

async function renderSessiesSection(container) {
  const [sessions, eventTypes] = await Promise.all([
    fetchRows("session_templates", { brandScoped: true, orderBy: "start_time" }),
    fetchRows("event_types", { brandScoped: true, orderBy: "name" }).catch(() => []),
  ]);

  const eventTypeById = Object.fromEntries((eventTypes || []).map((eventType) => [eventType.id, eventType]));

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Sessies & tijdslots",
      description:
        "Standaard sessietemplates voor ochtendsessies, middagsessies en avondevents. Handig voor repetitieve hotel/event workflows.",
      actions: `<button class="cp-btn cp-btn-primary" id="cp-add-session" type="button">+ Sessietemplate toevoegen</button>`,
    })}

    ${sessions.length
      ? `
      <div class="cp-table-card">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Start</th>
              <th>Einde</th>
              <th>Max deelnemers</th>
              <th>Event type</th>
              <th class="cp-ta-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            ${sessions
              .map((session) => {
                const typeLabel =
                  session.default_event_type ||
                  eventTypeById[session.event_type_id]?.name ||
                  session.event_type ||
                  "-";

                return `
                  <tr>
                    <td><strong>${esc(session.name || "-")}</strong></td>
                    <td>${esc(session.start_time || "-")}</td>
                    <td>${esc(session.end_time || "-")}</td>
                    <td>${session.max_participants || "-"}</td>
                    <td>${esc(typeLabel)}</td>
                    <td class="cp-ta-right">
                      <div class="cp-row-actions">
                        <button class="cp-btn-link" data-action="edit-session" data-id="${session.id}" type="button">Bewerken</button>
                        <button class="cp-btn-link cp-btn-link-danger" data-action="delete-session" data-id="${session.id}" type="button">Verwijderen</button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : renderEmptyState("Nog geen sessietemplates", "Voeg templates toe om nieuwe events sneller te plannen.")}
  `;

  container.querySelector("#cp-add-session").onclick = () => openSessionModal(null, eventTypes);

  container.querySelectorAll("[data-action='edit-session']").forEach((btn) => {
    btn.onclick = () => {
      const session = sessions.find((entry) => String(entry.id) === String(btn.dataset.id));
      if (session) openSessionModal(session, eventTypes);
    };
  });

  container.querySelectorAll("[data-action='delete-session']").forEach((btn) => {
    btn.onclick = async () => {
      const confirmed = window.confirm("Sessie verwijderen? Deze actie kan historische referenties beïnvloeden.");
      if (!confirmed) return;

      const { error } = await supabase.from("session_templates").delete().eq("id", btn.dataset.id);
      if (error) {
        showToast(`Verwijderen mislukt: ${error.message}`, "error");
        return;
      }

      showToast("Sessietemplate verwijderd.", "success");
      await loadSection("sessies");
    };
  });
}

function openSessionModal(session, eventTypes = []) {
  const isEdit = !!session;
  const selectedEventTypeId = session?.event_type_id || "";
  const selectedEventTypeName = session?.default_event_type || session?.event_type || "";

  openModal({
    title: isEdit ? "Sessietemplate bewerken" : "Nieuwe sessietemplate",
    description: "Koppel slots aan eventtypes voor voorspelbare planning in operations.",
    saveLabel: isEdit ? "Opslaan" : "Aanmaken",
    body: `
      <div class="cp-grid cp-grid-2">
        <label class="cp-field cp-col-span-2">
          <span>Naam</span>
          <input id="cp-session-name" type="text" value="${esc(session?.name || "")}" placeholder="Ochtendsessie" />
        </label>

        <label class="cp-field">
          <span>Starttijd</span>
          <input id="cp-session-start" type="time" value="${esc(session?.start_time || "")}" />
        </label>

        <label class="cp-field">
          <span>Eindtijd</span>
          <input id="cp-session-end" type="time" value="${esc(session?.end_time || "")}" />
        </label>

        <label class="cp-field">
          <span>Max deelnemers</span>
          <input id="cp-session-max" type="number" min="0" value="${session?.max_participants ?? ""}" />
        </label>

        <label class="cp-field">
          <span>Standaard event type</span>
          <select id="cp-session-event-type">
            <option value="">Geen standaard event type</option>
            ${eventTypes
              .map(
                (eventType) =>
                  `<option value="${esc(eventType.id)}" data-name="${esc(eventType.name || "")}" ${String(
                    eventType.id
                  ) === String(selectedEventTypeId)
                    ? "selected"
                    : ""}>${esc(eventType.name || "-")}</option>`
              )
              .join("")}
          </select>
        </label>

        <label class="cp-field cp-col-span-2">
          <span>Fallback event type naam</span>
          <input id="cp-session-event-type-name" type="text" value="${esc(selectedEventTypeName)}" placeholder="Kickoff" />
        </label>
      </div>
    `,
    onSave: async (overlay) => {
      const name = overlay.querySelector("#cp-session-name").value.trim();
      if (!name) {
        showToast("Naam is verplicht.", "error");
        return false;
      }

      const typeSelect = overlay.querySelector("#cp-session-event-type");
      const selectedOption = typeSelect.options[typeSelect.selectedIndex];
      const defaultTypeName =
        overlay.querySelector("#cp-session-event-type-name").value.trim() || selectedOption?.dataset?.name || "";

      const payload = {
        brand: state.currentBrand,
        name,
        start_time: overlay.querySelector("#cp-session-start").value,
        end_time: overlay.querySelector("#cp-session-end").value,
        max_participants: parseNullableInt(overlay.querySelector("#cp-session-max").value),
        event_type_id: typeSelect.value || null,
        default_event_type: defaultTypeName,
      };

      const { error } = await saveRecord({
        table: "session_templates",
        id: session?.id,
        payload,
        optionalColumns: ["brand", "event_type_id", "default_event_type"],
      });

      if (error) {
        showToast(`Opslaan mislukt: ${error.message}`, "error");
        return false;
      }

      showToast("Sessietemplate opgeslagen.", "success");
      await loadSection("sessies");
      return true;
    },
  });
}

async function renderGebruikersSection(container) {
  const dashboardUrl = getSupabaseUsersDashboardUrl();
  const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Gebruikers & rollen",
      description:
        "Admin beheert rollen en merktoewijzing. Uitnodigingen verlopen via Supabase Invite flow voor security en compliance.",
    })}

    <div class="cp-grid cp-grid-2">
      <article class="cp-card">
        <header class="cp-card-head">
          <div>
            <h3>Nieuwe gebruiker uitnodigen</h3>
            <p>Gebruik Supabase Authentication invite. Deze app stuurt je naar de juiste pagina.</p>
          </div>
          <button class="cp-btn cp-btn-ghost" id="cp-open-supabase-users" type="button">Open Supabase Users</button>
        </header>

        <div class="cp-grid cp-grid-3">
          <label class="cp-field cp-col-span-2">
            <span>E-mail</span>
            <input id="cp-invite-email" type="email" placeholder="naam@bedrijf.com" />
          </label>
          <label class="cp-field">
            <span>Rol</span>
            <select id="cp-invite-role">
              <option value="admin">admin</option>
              <option value="ops" selected>ops</option>
              <option value="viewer">viewer</option>
            </select>
          </label>
          <label class="cp-field">
            <span>Merk</span>
            <select id="cp-invite-brand">
              ${renderBrandOptions(state.currentBrand)}
            </select>
          </label>
          <div class="cp-field cp-col-span-2">
            <span>Workflow</span>
            <p class="cp-hint">1) Vul gegevens in 2) klik op voorbereiden 3) plak in interne SOP of invite ticket.</p>
          </div>
        </div>

        <div class="cp-row-actions cp-row-actions-end">
          <button class="cp-btn cp-btn-primary" id="cp-prepare-invite" type="button">Invite voorbereiden</button>
        </div>
      </article>

      <article class="cp-card">
        <header class="cp-card-head">
          <div>
            <h3>Rollenmodel</h3>
            <p>Duidelijke rechten per teamtype.</p>
          </div>
        </header>

        <div class="cp-role-grid">
          <div><strong>admin</strong><small>Volledige toegang tot alle settings en operationele modules.</small></div>
          <div><strong>ops</strong><small>Events, deelnemers, check-in en export beheren.</small></div>
          <div><strong>viewer</strong><small>Read-only toegang voor stakeholders en management.</small></div>
        </div>
      </article>
    </div>

    ${profiles?.length
      ? `
      <div class="cp-table-card">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>E-mail</th>
              <th>Rol</th>
              <th>Merk</th>
              <th>Aangemaakt</th>
              <th>Laatst actief</th>
              <th>Status</th>
              <th class="cp-ta-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            ${profiles
              .map((profile) => {
                const lastSeen = profile.last_sign_in_at || profile.last_seen_at || profile.updated_at || "";
                const isActive = profile.is_active !== false;
                return `
                  <tr>
                    <td>
                      <strong>${esc(profile.full_name || "-")}</strong>
                      <small>${esc(profile.id || "")}</small>
                    </td>
                    <td>${esc(profile.email || "-")}</td>
                    <td>
                      <select class="cp-inline-select" data-field="role" data-id="${profile.id}">
                        <option value="admin" ${profile.role === "admin" ? "selected" : ""}>admin</option>
                        <option value="ops" ${profile.role === "ops" ? "selected" : ""}>ops</option>
                        <option value="viewer" ${profile.role === "viewer" ? "selected" : ""}>viewer</option>
                      </select>
                    </td>
                    <td>
                      <select class="cp-inline-select" data-field="brand_id" data-id="${profile.id}">
                        ${renderBrandOptions(profile.brand_id || "academy")}
                      </select>
                    </td>
                    <td>${formatDateCell(profile.created_at)}</td>
                    <td>${formatDateCell(lastSeen)}</td>
                    <td>${renderStatusBadge(isActive)}</td>
                    <td class="cp-ta-right">
                      <div class="cp-row-actions cp-row-actions-end">
                        <label class="cp-inline-toggle">
                          <input type="checkbox" data-field="is_active" data-id="${profile.id}" ${isActive ? "checked" : ""} />
                          <span>Actief</span>
                        </label>
                        <button class="cp-btn-link" data-action="save-profile" data-id="${profile.id}" type="button">Opslaan</button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : renderEmptyState("Geen gebruikers", "Profiles tabel bevat nog geen records.")}
  `;

  container.querySelector("#cp-open-supabase-users").onclick = () => {
    window.open(dashboardUrl, "_blank", "noopener,noreferrer");
  };

  container.querySelector("#cp-prepare-invite").onclick = async () => {
    const email = container.querySelector("#cp-invite-email").value.trim();
    const role = container.querySelector("#cp-invite-role").value;
    const brand = container.querySelector("#cp-invite-brand").value;

    if (!email) {
      showToast("Vul een e-mailadres in.", "error");
      return;
    }

    const instruction = [
      "Supabase Invite voorbereiding",
      `Email: ${email}`,
      `Rol: ${role}`,
      `Merk: ${brand}`,
      `Open: ${dashboardUrl}`,
      "Stap: Authentication > Users > Invite user",
    ].join("\n");

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(instruction).catch(() => null);
    }

    showToast("Invite instructie voorbereid en dashboard-link geopend.", "success");
    window.open(dashboardUrl, "_blank", "noopener,noreferrer");
  };

  container.querySelectorAll("[data-action='save-profile']").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const roleEl = container.querySelector(`select[data-field='role'][data-id='${id}']`);
      const brandEl = container.querySelector(`select[data-field='brand_id'][data-id='${id}']`);
      const activeEl = container.querySelector(`input[data-field='is_active'][data-id='${id}']`);

      const payload = {
        role: roleEl?.value,
        brand_id: brandEl?.value,
        is_active: !!activeEl?.checked,
      };

      const { error } = await saveRecord({
        table: "profiles",
        id,
        payload,
        optionalColumns: ["is_active", "brand_id"],
      });

      if (error) {
        showToast(`Gebruiker opslaan mislukt: ${error.message}`, "error");
        return;
      }

      showToast("Gebruiker bijgewerkt.", "success");
      await loadSection("gebruikers");
    };
  });
}

async function renderNotificatiesSection(container) {
  const templates = await fetchRows("notification_templates", { brandScoped: true, orderBy: "trigger_type" });
  const templateByTrigger = Object.fromEntries((templates || []).map((template) => [template.trigger_type, template]));

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Notificaties & e-mailtemplates",
      description:
        "Stuur consistente communicatie over uitnodiging, RSVP, reminders en follow-up. Variabelen: {{naam}}, {{event}}, {{datum}}, {{locatie}}.",
      actions: `<button class="cp-btn cp-btn-primary" id="cp-save-all-templates" type="button">Alles opslaan</button>`,
      sideInfo: `Merkcontext: <strong>${esc(getBrandLabel(state.currentBrand))}</strong>`,
    })}

    <div class="cp-stack">
      ${NOTIFICATION_TRIGGERS.map((trigger) => {
        const template = templateByTrigger[trigger.key];
        return `
          <article class="cp-card" data-trigger="${trigger.key}">
            <header class="cp-card-head">
              <div>
                <h3>${esc(trigger.label)}</h3>
                <p>Trigger key: <code>${esc(trigger.key)}</code></p>
              </div>
              <label class="cp-inline-toggle">
                <input type="checkbox" data-field="is_active" ${template?.is_active ? "checked" : ""} />
                <span>Aan</span>
              </label>
            </header>

            <div class="cp-grid cp-grid-2">
              <label class="cp-field cp-col-span-2">
                <span>Onderwerpregel</span>
                <input type="text" data-field="subject" value="${esc(template?.subject || "")}" placeholder="Onderwerp van de mail" />
              </label>
              <label class="cp-field cp-col-span-2">
                <span>Template tekst (plain text)</span>
                <textarea data-field="body" rows="5" placeholder="Beste {{naam}}, ...">${esc(template?.body || "")}</textarea>
              </label>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;

  container.querySelector("#cp-save-all-templates").onclick = async () => {
    for (const trigger of NOTIFICATION_TRIGGERS) {
      const card = container.querySelector(`[data-trigger='${trigger.key}']`);
      const existing = templateByTrigger[trigger.key];

      const payload = {
        brand: state.currentBrand,
        trigger_type: trigger.key,
        is_active: !!card.querySelector("[data-field='is_active']")?.checked,
        subject: card.querySelector("[data-field='subject']")?.value?.trim() || "",
        body: card.querySelector("[data-field='body']")?.value || "",
        updated_at: new Date().toISOString(),
      };

      const { error } = await saveRecord({
        table: "notification_templates",
        id: existing?.id,
        payload,
        optionalColumns: ["brand"],
      });

      if (error) {
        showToast(`Template ${trigger.label} kon niet worden opgeslagen: ${error.message}`, "error");
        return;
      }
    }

    showToast("Alle notificatietemplates zijn opgeslagen.", "success");
    await loadSection("notificaties");
  };
}

async function renderCateringSection(container) {
  const [options, eventTypes] = await Promise.all([
    fetchRows("catering_options", { brandScoped: true, orderBy: "name" }),
    fetchRows("event_types", { brandScoped: true, orderBy: "name" }).catch(() => []),
  ]);

  const eventTypeById = Object.fromEntries((eventTypes || []).map((eventType) => [eventType.id, eventType]));

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Catering opties",
      description:
        "Centrale cateringcatalogus voor events. Definieer welke opties passen bij specifieke eventtypes.",
      actions: `<button class="cp-btn cp-btn-primary" id="cp-add-catering" type="button">+ Optie toevoegen</button>`,
    })}

    ${options.length
      ? `
      <div class="cp-table-card">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Beschrijving</th>
              <th>Geschikt voor event type</th>
              <th>Status</th>
              <th class="cp-ta-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            ${options
              .map((option) => {
                const eventTypeLabel =
                  option.event_type ||
                  option.default_event_type ||
                  eventTypeById[option.event_type_id]?.name ||
                  "-";
                return `
                  <tr>
                    <td><strong>${esc(option.name || "-")}</strong></td>
                    <td>${esc(option.description || "-")}</td>
                    <td>${esc(eventTypeLabel)}</td>
                    <td>${renderStatusBadge(option.is_active !== false)}</td>
                    <td class="cp-ta-right">
                      <div class="cp-row-actions cp-row-actions-end">
                        <button class="cp-btn-link" data-action="edit-catering" data-id="${option.id}" type="button">Bewerken</button>
                        <button class="cp-btn-link" data-action="toggle-catering" data-id="${option.id}" data-active="${String(
                          option.is_active !== false
                        )}" type="button">${option.is_active !== false ? "Deactiveren" : "Activeren"}</button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : renderEmptyState("Geen cateringopties", "Voeg catering opties toe zodat planners sneller kunnen kiezen.")}
  `;

  container.querySelector("#cp-add-catering").onclick = () => openCateringModal(null, eventTypes);

  container.querySelectorAll("[data-action='edit-catering']").forEach((btn) => {
    btn.onclick = () => {
      const option = options.find((entry) => String(entry.id) === String(btn.dataset.id));
      if (option) openCateringModal(option, eventTypes);
    };
  });

  container.querySelectorAll("[data-action='toggle-catering']").forEach((btn) => {
    btn.onclick = async () => {
      const isActive = btn.dataset.active === "true";
      const { error } = await saveRecord({
        table: "catering_options",
        id: btn.dataset.id,
        payload: { is_active: !isActive },
        optionalColumns: ["is_active"],
      });

      if (error) {
        showToast(`Statusupdate mislukt: ${error.message}`, "error");
        return;
      }

      showToast("Cateringstatus bijgewerkt.", "success");
      await loadSection("catering");
    };
  });
}

function openCateringModal(option, eventTypes = []) {
  const isEdit = !!option;

  openModal({
    title: isEdit ? "Catering optie bewerken" : "Nieuwe catering optie",
    description: "Gebruik vaste opties voor consistente hospitality service levels.",
    saveLabel: isEdit ? "Opslaan" : "Aanmaken",
    body: `
      <div class="cp-grid cp-grid-2">
        <label class="cp-field cp-col-span-2">
          <span>Naam</span>
          <input id="cp-catering-name" type="text" value="${esc(option?.name || "")}" placeholder="Drank + lunch" />
        </label>

        <label class="cp-field cp-col-span-2">
          <span>Beschrijving</span>
          <textarea id="cp-catering-description" rows="3" placeholder="Inhoud van dit cateringpakket">${esc(
            option?.description || ""
          )}</textarea>
        </label>

        <label class="cp-field">
          <span>Geschikt event type</span>
          <select id="cp-catering-event-type">
            <option value="">Geen specifiek event type</option>
            ${eventTypes
              .map((eventType) => {
                const selected =
                  String(option?.event_type_id || "") === String(eventType.id) ||
                  String(option?.event_type || "") === String(eventType.name || "");
                return `<option value="${esc(eventType.id)}" data-name="${esc(eventType.name || "")}" ${
                  selected ? "selected" : ""
                }>${esc(eventType.name || "-")}</option>`;
              })
              .join("")}
          </select>
        </label>

        <label class="cp-field">
          <span>Fallback event type naam</span>
          <input id="cp-catering-event-type-name" type="text" value="${esc(
            option?.event_type || option?.default_event_type || ""
          )}" placeholder="Masterclass" />
        </label>

        <label class="cp-field cp-toggle-field cp-col-span-2">
          <span>Actief</span>
          <input id="cp-catering-active" type="checkbox" ${option?.is_active !== false ? "checked" : ""} />
        </label>
      </div>
    `,
    onSave: async (overlay) => {
      const name = overlay.querySelector("#cp-catering-name").value.trim();
      if (!name) {
        showToast("Naam is verplicht.", "error");
        return false;
      }

      const eventTypeSelect = overlay.querySelector("#cp-catering-event-type");
      const selectedOption = eventTypeSelect.options[eventTypeSelect.selectedIndex];

      const payload = {
        brand: state.currentBrand,
        name,
        description: overlay.querySelector("#cp-catering-description").value.trim(),
        event_type_id: eventTypeSelect.value || null,
        event_type:
          overlay.querySelector("#cp-catering-event-type-name").value.trim() || selectedOption?.dataset?.name || "",
        is_active: overlay.querySelector("#cp-catering-active").checked,
      };

      const { error } = await saveRecord({
        table: "catering_options",
        id: option?.id,
        payload,
        optionalColumns: ["brand", "event_type_id", "event_type", "is_active"],
      });

      if (error) {
        showToast(`Opslaan mislukt: ${error.message}`, "error");
        return false;
      }

      showToast("Catering optie opgeslagen.", "success");
      await loadSection("catering");
      return true;
    },
  });
}

async function renderExportSection(container) {
  const brand = state.currentBrand;
  const { data: settingsRows, error } = await supabase.from("app_settings").select("*").eq("brand", brand);
  if (error) throw error;

  const defaultFields = EXPORT_FIELDS;
  const selectedFields = splitCsv(getSetting(settingsRows, brand, "export_fields", defaultFields.join(",")));

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Export & integraties",
      description:
        "Bepaal CSV standaarden, datumformaten, bestandsnamen en voorbereide integratieparameters voor externe tools.",
      sideInfo: `Merkcontext: <strong>${esc(getBrandLabel(brand))}</strong>`,
    })}

    <div class="cp-grid cp-grid-2">
      <article class="cp-card">
        <header class="cp-card-head">
          <div>
            <h3>CSV Export instellingen</h3>
            <p>Stel defaults in voor operations en rapportering.</p>
          </div>
        </header>

        <div class="cp-field">
          <span>Standaard velden</span>
          <div class="cp-chip-check-wrap">
            ${EXPORT_FIELDS.map(
              (field) => `
              <label class="cp-chip-check">
                <input type="checkbox" class="cp-export-field" value="${field}" ${selectedFields.includes(field) ? "checked" : ""} />
                <span>${field}</span>
              </label>
            `
            ).join("")}
          </div>
        </div>

        <div class="cp-grid cp-grid-2">
          <label class="cp-field">
            <span>Datumformaat</span>
            <select id="cp-export-date-format">
              <option value="DD/MM/YYYY" ${getSetting(settingsRows, brand, "export_dateformat", "DD/MM/YYYY") === "DD/MM/YYYY" ? "selected" : ""}>DD/MM/YYYY</option>
              <option value="ISO" ${getSetting(settingsRows, brand, "export_dateformat", "DD/MM/YYYY") === "ISO" ? "selected" : ""}>ISO</option>
            </select>
          </label>

          <label class="cp-field">
            <span>Bestandsnaam patroon</span>
            <input id="cp-export-filename" type="text" value="${esc(
              getSetting(settingsRows, brand, "export_filename", "archer_events_{{datum}}.csv")
            )}" />
          </label>
        </div>

        <div class="cp-row-actions cp-row-actions-end">
          <button class="cp-btn cp-btn-primary" id="cp-save-export" type="button">Export opslaan</button>
        </div>
      </article>

      <article class="cp-card">
        <header class="cp-card-head">
          <div>
            <h3>Integraties</h3>
            <p>Infra voorbereiden voor webhooks, API keys en storage.</p>
          </div>
        </header>

        <label class="cp-field">
          <span>Webhook URL</span>
          <input id="cp-int-webhook" type="url" value="${esc(getSetting(settingsRows, brand, "webhook_url", ""))}" placeholder="https://hooks.example.com/..." />
        </label>

        <label class="cp-field">
          <span>Read-only API key</span>
          <div class="cp-inline-input-row">
            <input id="cp-int-api-key" type="text" value="${esc(getSetting(settingsRows, brand, "api_key", ""))}" readonly />
            <button class="cp-btn cp-btn-ghost" id="cp-generate-api-key" type="button">Genereren</button>
          </div>
        </label>

        <label class="cp-field">
          <span>Supabase Storage bucket</span>
          <input id="cp-int-storage-bucket" type="text" value="${esc(
            getSetting(settingsRows, brand, "storage_bucket", "event-assets")
          )}" placeholder="event-assets" />
        </label>

        <div class="cp-row-actions cp-row-actions-end">
          <button class="cp-btn cp-btn-primary" id="cp-save-integrations" type="button">Integraties opslaan</button>
        </div>
      </article>
    </div>
  `;

  container.querySelector("#cp-generate-api-key").onclick = () => {
    const generated = `ak_${createUuidLike().replace(/-/g, "")}`;
    container.querySelector("#cp-int-api-key").value = generated;
  };

  container.querySelector("#cp-save-export").onclick = async () => {
    const fields = [...container.querySelectorAll(".cp-export-field:checked")].map((checkbox) => checkbox.value);

    const error = await upsertSettings(brand, [
      ["export_fields", fields.join(",")],
      ["export_dateformat", container.querySelector("#cp-export-date-format").value],
      ["export_filename", container.querySelector("#cp-export-filename").value.trim()],
    ]);

    if (error) {
      showToast(`Exportsettings konden niet opgeslagen worden: ${error.message}`, "error");
      return;
    }

    showToast("Exportinstellingen opgeslagen.", "success");
  };

  container.querySelector("#cp-save-integrations").onclick = async () => {
    const error = await upsertSettings(brand, [
      ["webhook_url", container.querySelector("#cp-int-webhook").value.trim()],
      ["api_key", container.querySelector("#cp-int-api-key").value.trim()],
      ["storage_bucket", container.querySelector("#cp-int-storage-bucket").value.trim()],
    ]);

    if (error) {
      showToast(`Integraties konden niet opgeslagen worden: ${error.message}`, "error");
      return;
    }

    showToast("Integratie-instellingen opgeslagen.", "success");
  };
}

async function renderAuditLogSection(container) {
  const logs = await fetchRows("audit_log", { orderBy: "created_at", ascending: false, limit: 200 });

  container.innerHTML = `
    ${renderSectionHeader({
      title: "Audit log",
      description:
        "Overzicht van kritieke acties: wie deed wat, wanneer en op welke entiteit. Handig voor compliance en incidentanalyse.",
      actions: `<input id="cp-audit-search" class="cp-search" type="search" placeholder="Zoek op gebruiker, actie of entiteit" />`,
    })}

    ${logs.length
      ? `
      <div class="cp-table-card">
        <table class="cp-table cp-table-compact" id="cp-audit-table">
          <thead>
            <tr>
              <th>Tijdstip</th>
              <th>Gebruiker</th>
              <th>Actie</th>
              <th>Entiteit</th>
              <th>Record</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map((log) => {
                const actor = log.actor_name || log.actor_email || log.user_email || log.actor_id || "-";
                const action = log.action || log.event || "-";
                const entity = log.table_name || log.entity || "-";
                const record = log.record_id || log.entity_id || "-";
                const detail = extractAuditDetail(log);

                return `
                  <tr>
                    <td>${formatDateCell(log.created_at)}</td>
                    <td>${esc(actor)}</td>
                    <td><span class="cp-audit-action">${esc(action)}</span></td>
                    <td>${esc(entity)}</td>
                    <td><code>${esc(String(record).slice(0, 16))}</code></td>
                    <td>${esc(detail)}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : renderEmptyState("Geen audit records", "Audit log tabel bevat nog geen acties.")}
  `;

  const searchInput = container.querySelector("#cp-audit-search");
  const rows = [...container.querySelectorAll("#cp-audit-table tbody tr")];

  if (searchInput && rows.length) {
    searchInput.oninput = () => {
      const query = searchInput.value.trim().toLowerCase();
      rows.forEach((row) => {
        const visible = !query || row.textContent.toLowerCase().includes(query);
        row.style.display = visible ? "" : "none";
      });
    };
  }
}

function renderSectionHeader({ title, description, actions = "", sideInfo = "" }) {
  return `
    <div class="cp-section-head">
      <div class="cp-section-head-main">
        <h2>${esc(title)}</h2>
        <p>${description}</p>
      </div>
      <div class="cp-section-head-actions">
        ${sideInfo ? `<div class="cp-side-info">${sideInfo}</div>` : ""}
        ${actions || ""}
      </div>
    </div>
  `;
}

function renderLoading(text) {
  return `<div class="cp-feedback cp-feedback-loading">${esc(text)}</div>`;
}

function renderError(message) {
  return `<div class="cp-feedback cp-feedback-error">Fout bij laden: ${esc(message || "onbekende fout")}</div>`;
}

function renderEmptyState(title, description) {
  return `
    <div class="cp-empty-state">
      <strong>${esc(title)}</strong>
      <p>${esc(description)}</p>
    </div>
  `;
}

function renderStatusBadge(isActive) {
  return `<span class="cp-status ${isActive ? "active" : "inactive"}">${isActive ? "Actief" : "Inactief"}</span>`;
}

function renderTagList(values, maxCount = 3) {
  const list = ensureArray(values);
  if (!list.length) return "-";

  const visible = list.slice(0, maxCount).map((value) => `<span class="cp-tag">${esc(value)}</span>`).join("");
  const overflow = list.length > maxCount ? `<span class="cp-tag">+${list.length - maxCount}</span>` : "";

  return `<span class="cp-tag-group">${visible}${overflow}</span>`;
}

function renderBrandOptions(selectedBrandId = state.currentBrand) {
  return BRANDS.map(
    (brand) => `<option value="${brand.id}" ${brand.id === selectedBrandId ? "selected" : ""}>${esc(brand.label)}</option>`
  ).join("");
}

function getThemeBrandKey(brandId) {
  return BRANDS.find((brand) => brand.id === brandId)?.key || "archer_academy";
}

function getBrandLabel(brandId) {
  return BRANDS.find((brand) => brand.id === brandId)?.label || brandId || "Onbekend merk";
}

function getSetting(settingsRows, brandId, key, fallback = "") {
  const entry = settingsRows?.find((row) => row.brand === brandId && row.key === key);
  return entry?.value ?? fallback;
}

function readInputValue(parent, fieldName) {
  const element = parent.querySelector(`[data-field='${fieldName}']`);
  return element?.value?.trim?.() ?? "";
}

function parseNullableInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((part) => part.trim()).filter(Boolean);
  return [];
}

function splitCsv(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatDateCell(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return esc(String(value));
  return date.toLocaleString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractAuditDetail(log) {
  if (!log) return "-";

  if (typeof log.description === "string" && log.description.trim()) return log.description.trim();
  if (typeof log.details === "string" && log.details.trim()) return log.details.trim();

  const metadata = log.metadata || log.payload || log.changes || null;
  if (metadata && typeof metadata === "object") {
    const compact = Object.entries(metadata)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
      .join(" | ");
    return compact || "-";
  }

  return "-";
}

function getSupabaseUsersDashboardUrl() {
  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
    if (!projectRef) return "https://supabase.com/dashboard";
    return `https://supabase.com/dashboard/project/${projectRef}/auth/users`;
  } catch {
    return "https://supabase.com/dashboard";
  }
}

function createUuidLike() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function fetchAppSettings(brandIds) {
  const { data, error } = await supabase.from("app_settings").select("*").in("brand", brandIds);
  if (error) throw error;
  return data || [];
}

async function fetchRows(table, options = {}) {
  const {
    columns = "*",
    brandScoped = false,
    orderBy = null,
    ascending = true,
    limit = null,
  } = options;

  let query = supabase.from(table).select(columns);

  if (brandScoped) query = query.eq("brand", state.currentBrand);
  if (orderBy) query = query.order(orderBy, { ascending });
  if (limit) query = query.limit(limit);

  let { data, error } = await query;

  // Some tables may not have a brand column; fallback to non-scoped query.
  if (error && brandScoped && errorHasColumn(error, "brand")) {
    let fallbackQuery = supabase.from(table).select(columns);
    if (orderBy) fallbackQuery = fallbackQuery.order(orderBy, { ascending });
    if (limit) fallbackQuery = fallbackQuery.limit(limit);
    ({ data, error } = await fallbackQuery);
  }

  if (error) throw error;
  return data || [];
}

async function saveRecord({ table, id = null, payload, optionalColumns = [] }) {
  let workingPayload = { ...payload };

  while (true) {
    const query = id
      ? supabase.from(table).update(workingPayload).eq("id", id)
      : supabase.from(table).insert([workingPayload]);

    const { error } = await query;
    if (!error) return { error: null };

    const removable = optionalColumns.find(
      (column) => Object.prototype.hasOwnProperty.call(workingPayload, column) && errorHasColumn(error, column)
    );

    if (!removable) return { error };
    delete workingPayload[removable];
  }
}

async function upsertSettings(brandId, keyValuePairs) {
  for (const [key, value] of keyValuePairs) {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ brand: brandId, key, value: value ?? "" }, { onConflict: "brand,key" });

    if (error) return error;
  }

  return null;
}

function errorHasColumn(error, columnName) {
  const haystack = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return haystack.includes("column") && haystack.includes(String(columnName).toLowerCase());
}

function openModal({ title, description = "", body, saveLabel = "Opslaan", onSave }) {
  const overlay = document.createElement("div");
  overlay.className = "cp-modal-overlay";

  overlay.innerHTML = `
    <div class="cp-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="cp-modal-head">
        <div>
          <h3>${esc(title)}</h3>
          ${description ? `<p>${esc(description)}</p>` : ""}
        </div>
        <button class="cp-modal-close" data-action="close-modal" type="button">✕</button>
      </header>
      <div class="cp-modal-body">${body}</div>
      <footer class="cp-modal-foot">
        <button class="cp-btn cp-btn-ghost" data-action="close-modal" type="button">Annuleren</button>
        <button class="cp-btn cp-btn-primary" data-action="save-modal" type="button">${esc(saveLabel)}</button>
      </footer>
    </div>
  `;

  const close = () => {
    overlay.remove();
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  overlay.querySelectorAll("[data-action='close-modal']").forEach((btn) => {
    btn.onclick = close;
  });

  const saveButton = overlay.querySelector("[data-action='save-modal']");
  saveButton.onclick = async () => {
    saveButton.disabled = true;
    saveButton.textContent = "Opslaan...";

    try {
      const shouldClose = await onSave(overlay);
      if (shouldClose !== false) close();
    } catch (error) {
      showToast(`Opslaan mislukt: ${error.message || "onbekende fout"}`, "error");
    } finally {
      if (document.body.contains(overlay)) {
        saveButton.disabled = false;
        saveButton.textContent = saveLabel;
      }
    }
  };

  document.body.appendChild(overlay);
  return overlay;
}
