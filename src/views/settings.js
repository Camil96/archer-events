import { supabase } from "../supabaseClient.js";
import { store } from "../store.js";
import { showToast } from "../utils.js";

// ─── SECTIE DEFINITIES ────────────────────────────────────────────────────────
const SECTIONS = [
    { id: "organisatie", icon: "◈", label: "Organisatie" },
    { id: "locaties", icon: "▣", label: "Locaties" },
    { id: "programmas", icon: "◉", label: "Programma's" },
    { id: "event-types", icon: "◎", label: "Event types" },
    { id: "sessies", icon: "◷", label: "Sessies & slots" },
    { id: "gebruikers", icon: "◯", label: "Gebruikers" },
    { id: "notificaties", icon: "◬", label: "Notificaties" },
    { id: "catering", icon: "◫", label: "Catering" },
    { id: "export", icon: "◳", label: "Export & integraties" },
    { id: "auditlog", icon: "◱", label: "Audit log" },
];

const FACILITIES = ["WiFi", "Catering", "Parking", "AV-installatie", "Livestream", "Kleedkamers"];
const NOTIFICATION_TRIGGERS = [
    { key: "invite", label: "Uitnodiging deelnemer" },
    { key: "rsvp", label: "Bevestiging na RSVP" },
    { key: "reminder", label: "Herinnering (X dagen voor event)" },
    { key: "checkin", label: "Check-in bevestiging" },
    { key: "followup", label: "Follow-up na event" },
];

let activeSection = "organisatie";

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
export async function renderSettings(container) {
    const body = container || document.getElementById("page-body");
    const actions = document.getElementById("page-actions");
    if (actions) actions.innerHTML = "";
    if (!body) throw new Error("Settings container niet gevonden.");

    body.innerHTML = `
    <div class="settings-wrap">
      <nav class="settings-nav">
        ${SECTIONS.map(s => `
          <div class="settings-nav-item ${s.id === activeSection ? "active" : ""}"
               data-section="${s.id}">
            <span class="sn-icon">${s.icon}</span>
            <span>${s.label}</span>
          </div>`).join("")}
      </nav>
      <div class="settings-content" id="settings-content">
        <div class="s-loading">Laden...</div>
      </div>
    </div>`;

    document.querySelectorAll(".settings-nav-item").forEach(el => {
        el.onclick = () => {
            activeSection = el.dataset.section;
            document.querySelectorAll(".settings-nav-item")
                .forEach(n => n.classList.toggle("active", n.dataset.section === activeSection));
            loadSection(activeSection);
        };
    });

    loadSection(activeSection);
}

async function loadSection(id) {
    const content = document.getElementById("settings-content");
    content.innerHTML = `<div class="s-loading">Laden...</div>`;
    try {
        switch (id) {
            case "organisatie": await sectionOrganisatie(content); break;
            case "locaties": await sectionLocaties(content); break;
            case "programmas": await sectionProgrammas(content); break;
            case "event-types": await sectionEventTypes(content); break;
            case "sessies": await sectionSessies(content); break;
            case "gebruikers": await sectionGebruikers(content); break;
            case "notificaties": await sectionNotificaties(content); break;
            case "catering": await sectionCatering(content); break;
            case "export": await sectionExport(content); break;
            case "auditlog": await sectionAuditLog(content); break;
        }
    } catch (e) {
        content.innerHTML = `<div class="s-error">Fout bij laden: ${e.message}</div>`;
    }
}

// ─── 1. ORGANISATIE ──────────────────────────────────────────────────────────
async function sectionOrganisatie(el) {
    const brands = [
        { id: "academy", label: "Archer Academy", color: "#0000FF", email: "events@archer.finance" },
        { id: "invest", label: "Archer Invest", color: "#0000FF", email: "events@archer.finance" },
        { id: "fund", label: "Archer Investment Fund", color: "#0000FF", email: "events@archer.finance" },
    ];

    const { data: settings } = await supabase
        .from("app_settings").select("*").in("brand", ["academy", "invest", "fund"]);

    const getSetting = (brand, key) =>
        settings?.find(s => s.brand === brand && s.key === key)?.value || "";

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Organisatie</h2>
      <p>Beheer de merken en basisinformatie van Archer.</p>
    </div>
    ${brands.map(b => `
      <div class="s-card" id="org-${b.id}">
        <div class="s-card-title">
          <span class="brand-dot" style="background:${b.color}"></span>
          ${b.label}
        </div>
        <div class="s-grid-2">
          <div class="s-field">
            <label>Naam</label>
            <input type="text" id="org-name-${b.id}" value="${b.label}" />
          </div>
          <div class="s-field">
            <label>Contact e-mail</label>
            <input type="email" id="org-email-${b.id}" value="${getSetting(b.id, "contact_email") || b.email}" />
          </div>
          <div class="s-field">
            <label>Accent kleur</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="color" id="org-color-${b.id}" value="${getSetting(b.id, "accent_color") || b.color}" style="width:40px;height:36px;border:none;padding:0;cursor:pointer;border-radius:4px" />
              <input type="text" id="org-color-txt-${b.id}" value="${getSetting(b.id, "accent_color") || b.color}" style="flex:1" />
            </div>
          </div>
          <div class="s-field">
            <label>Logo URL</label>
            <input type="url" id="org-logo-${b.id}" value="${getSetting(b.id, "logo_url") || ""}" placeholder="https://..." />
          </div>
        </div>
        <div class="s-actions">
          <button class="s-btn s-btn-primary" onclick="window.__saveOrg('${b.id}')">Opslaan</button>
        </div>
      </div>`).join("")}`;

    // sync color picker ↔ text
    brands.forEach(b => {
        const picker = document.getElementById(`org-color-${b.id}`);
        const txt = document.getElementById(`org-color-txt-${b.id}`);
        picker.oninput = () => txt.value = picker.value;
        txt.oninput = () => { if (/^#[0-9a-fA-F]{6}$/.test(txt.value)) picker.value = txt.value; };
    });

    window.__saveOrg = async (brandId) => {
        const pairs = [
            ["contact_email", document.getElementById(`org-email-${brandId}`).value],
            ["accent_color", document.getElementById(`org-color-txt-${brandId}`).value],
            ["logo_url", document.getElementById(`org-logo-${brandId}`).value],
        ];
        for (const [key, value] of pairs) {
            await supabase.from("app_settings").upsert({ brand: brandId, key, value }, { onConflict: "brand,key" });
        }
        showToast("Instellingen opgeslagen.", "success");
    };
}

// ─── 2. LOCATIES ─────────────────────────────────────────────────────────────
async function sectionLocaties(el) {
    const { data: locs } = await supabase.from("locations").select("*").order("name");

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Locaties</h2>
      <p>Beheer alle fysieke locaties voor events.</p>
      <button class="s-btn s-btn-primary" id="add-loc-btn">+ Locatie toevoegen</button>
    </div>
    <div id="locs-list">
      ${renderLocsList(locs || [])}
    </div>`;

    document.getElementById("add-loc-btn").onclick = () => openLocModal(null, () => loadSection("locaties"));
    bindLocActions(locs || [], () => loadSection("locaties"));
}

function renderLocsList(locs) {
    if (!locs.length) return `<div class="s-empty">Geen locaties gevonden.</div>`;
    return `
    <div class="s-table-wrap">
      <table>
        <thead><tr><th>Naam</th><th>Stad</th><th>Capaciteit</th><th>Faciliteiten</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${locs.map(l => `
            <tr>
              <td><strong>${l.name}</strong><br><small style="color:#999">${l.address || ""}</small></td>
              <td>${l.city || ""}</td>
              <td>${l.capacity || "."}</td>
              <td>${(l.facilities || []).slice(0, 3).join(", ")}${(l.facilities || []).length > 3 ? "..." : ""}</td>
              <td><span class="s-badge ${l.is_active ? "s-badge-active" : "s-badge-off"}">${l.is_active ? "Actief" : "Inactief"}</span></td>
              <td class="s-row-actions">
                <button class="s-btn-link edit-loc" data-id="${l.id}">Bewerken</button>
                <button class="s-btn-link toggle-loc" data-id="${l.id}" data-active="${l.is_active}">${l.is_active ? "Deactiveren" : "Activeren"}</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function bindLocActions(locs, refresh) {
    document.querySelectorAll(".edit-loc").forEach(btn => {
        btn.onclick = () => {
            const loc = locs.find(l => l.id === btn.dataset.id);
            if (loc) openLocModal(loc, refresh);
        };
    });
    document.querySelectorAll(".toggle-loc").forEach(btn => {
        btn.onclick = async () => {
            await supabase.from("locations").update({ is_active: btn.dataset.active === "true" ? false : true }).eq("id", btn.dataset.id);
            showToast("Status bijgewerkt.", "success");
            refresh();
        };
    });
}

function openLocModal(loc, refresh) {
    const isEdit = !!loc;
    const fac = loc?.facilities || [];
    const overlay = document.createElement("div");
    overlay.className = "s-modal-overlay";
    overlay.innerHTML = `
    <div class="s-modal">
      <div class="s-modal-header">
        <h3>${isEdit ? "Locatie bewerken" : "Nieuwe locatie"}</h3>
        <button class="s-modal-close" id="loc-close">✕</button>
      </div>
      <div class="s-grid-2">
        <div class="s-field" style="grid-column:1/-1">
          <label>Naam</label>
          <input id="lf-name" value="${loc?.name || ""}" placeholder="bv. Archer HQ" />
        </div>
        <div class="s-field">
          <label>Adres</label>
          <input id="lf-address" value="${loc?.address || ""}" />
        </div>
        <div class="s-field">
          <label>Stad</label>
          <input id="lf-city" value="${loc?.city || ""}" />
        </div>
        <div class="s-field">
          <label>Postcode</label>
          <input id="lf-postal" value="${loc?.postal_code || ""}" />
        </div>
        <div class="s-field">
          <label>Capaciteit</label>
          <input id="lf-cap" type="number" value="${loc?.capacity || ""}" />
        </div>
        <div class="s-field" style="grid-column:1/-1">
          <label>Notities</label>
          <textarea id="lf-notes" rows="2">${loc?.notes || ""}</textarea>
        </div>
        <div class="s-field" style="grid-column:1/-1">
          <label>Faciliteiten</label>
          <div class="s-checkboxes">
            ${FACILITIES.map(f => `
              <label class="s-checkbox">
                <input type="checkbox" value="${f}" ${fac.includes(f) ? "checked" : ""} />
                ${f}
              </label>`).join("")}
          </div>
        </div>
      </div>
      <div class="s-modal-actions">
        <button class="s-btn s-btn-ghost" id="loc-cancel">Annuleren</button>
        <button class="s-btn s-btn-primary" id="loc-save">${isEdit ? "Opslaan" : "Aanmaken"}</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.getElementById("loc-close").onclick = () => overlay.remove();
    document.getElementById("loc-cancel").onclick = () => overlay.remove();
    document.getElementById("loc-save").onclick = async () => {
        const facilities = [...overlay.querySelectorAll(".s-checkboxes input:checked")].map(c => c.value);
        const payload = {
            brand: store.brandId || "academy",
            name: document.getElementById("lf-name").value.trim(),
            address: document.getElementById("lf-address").value.trim(),
            city: document.getElementById("lf-city").value.trim(),
            postal_code: document.getElementById("lf-postal").value.trim(),
            capacity: parseInt(document.getElementById("lf-cap").value) || null,
            notes: document.getElementById("lf-notes").value.trim(),
            facilities,
        };
        if (!payload.name) { showToast("Naam is verplicht.", "error"); return; }
        const { error } = isEdit
            ? await supabase.from("locations").update(payload).eq("id", loc.id)
            : await supabase.from("locations").insert([payload]);
        if (error) { showToast("Fout: " + error.message, "error"); return; }
        showToast(isEdit ? "Locatie opgeslagen." : "Locatie aangemaakt.", "success");
        overlay.remove();
        refresh();
    };
}

// ─── 3. PROGRAMMA'S ───────────────────────────────────────────────────────────
async function sectionProgrammas(el) {
    const { data: progs } = await supabase.from("programs").select("*").order("name");

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Programma's</h2>
      <p>Configureer de programma-categorieën per merk.</p>
      <button class="s-btn s-btn-primary" id="add-prog-btn">+ Programma toevoegen</button>
    </div>
    <div id="progs-list">
      ${renderSimpleList(progs || [], ["name", "brand", "description"], ["Naam", "Merk", "Beschrijving"], "prog")}
    </div>`;

    document.getElementById("add-prog-btn").onclick = () => openSimpleModal("programs", null, ["name", "brand", "description"], ["Naam", "Merk", "Omschrijving"], () => loadSection("programmas"));
    bindSimpleActions("prog", progs || [], "programs", ["name", "brand", "description"], ["Naam", "Merk", "Omschrijving"], () => loadSection("programmas"));
}

// ─── 4. EVENT TYPES ───────────────────────────────────────────────────────────
async function sectionEventTypes(el) {
    const { data: types } = await supabase.from("event_types").select("*").order("name");

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Event types</h2>
      <p>Definieer typen events met standaard capaciteit en catering.</p>
      <button class="s-btn s-btn-primary" id="add-et-btn">+ Event type toevoegen</button>
    </div>
    <div id="et-list">
      ${renderEventTypesList(types || [])}
    </div>`;

    document.getElementById("add-et-btn").onclick = () => openEventTypeModal(null, () => loadSection("event-types"));
    bindEventTypeActions(types || [], () => loadSection("event-types"));
}

function renderEventTypesList(types) {
    if (!types.length) return `<div class="s-empty">Geen event types gevonden.</div>`;
    return `
    <div class="s-table-wrap">
      <table>
        <thead><tr><th>Naam</th><th>Kleur</th><th>Std. capaciteit</th><th>Std. catering</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${types.map(t => `
            <tr>
              <td><strong>${t.name}</strong></td>
              <td><span class="s-color-dot" style="background:${t.color}"></span> ${t.color}</td>
              <td>${t.default_capacity || "."}</td>
              <td>${t.default_catering || "."}</td>
              <td><span class="s-badge ${t.is_active ? "s-badge-active" : "s-badge-off"}">${t.is_active ? "Actief" : "Inactief"}</span></td>
              <td class="s-row-actions">
                <button class="s-btn-link edit-et" data-id="${t.id}">Bewerken</button>
                <button class="s-btn-link toggle-et" data-id="${t.id}" data-active="${t.is_active}">${t.is_active ? "Deactiveren" : "Activeren"}</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function bindEventTypeActions(types, refresh) {
    document.querySelectorAll(".edit-et").forEach(btn => {
        btn.onclick = () => openEventTypeModal(types.find(t => t.id === btn.dataset.id), refresh);
    });
    document.querySelectorAll(".toggle-et").forEach(btn => {
        btn.onclick = async () => {
            await supabase.from("event_types").update({ is_active: btn.dataset.active === "true" ? false : true }).eq("id", btn.dataset.id);
            showToast("Status bijgewerkt.", "success");
            refresh();
        };
    });
}

function openEventTypeModal(item, refresh) {
    const isEdit = !!item;
    const overlay = document.createElement("div");
    overlay.className = "s-modal-overlay";
    overlay.innerHTML = `
    <div class="s-modal">
      <div class="s-modal-header">
        <h3>${isEdit ? "Event type bewerken" : "Nieuw event type"}</h3>
        <button class="s-modal-close" id="et-close">✕</button>
      </div>
      <div class="s-grid-2">
        <div class="s-field">
          <label>Naam</label>
          <input id="etf-name" value="${item?.name || ""}" placeholder="bv. Kickoff" />
        </div>
        <div class="s-field">
          <label>Kleur</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="color" id="etf-color-pick" value="${item?.color || "#4d73ff"}" style="width:40px;height:36px;border:none;padding:0;cursor:pointer;border-radius:4px" />
            <input type="text" id="etf-color" value="${item?.color || "#4d73ff"}" style="flex:1" />
          </div>
        </div>
        <div class="s-field">
          <label>Standaard capaciteit</label>
          <input id="etf-cap" type="number" value="${item?.default_capacity || ""}" />
        </div>
        <div class="s-field">
          <label>Standaard catering</label>
          <input id="etf-catering" value="${item?.default_catering || ""}" placeholder="bv. Drank & lunch" />
        </div>
      </div>
      <div class="s-modal-actions">
        <button class="s-btn s-btn-ghost" id="et-cancel">Annuleren</button>
        <button class="s-btn s-btn-primary" id="et-save">${isEdit ? "Opslaan" : "Aanmaken"}</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    const picker = document.getElementById("etf-color-pick");
    const txt = document.getElementById("etf-color");
    picker.oninput = () => txt.value = picker.value;
    txt.oninput = () => { if (/^#[0-9a-fA-F]{6}$/.test(txt.value)) picker.value = txt.value; };

    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.getElementById("et-close").onclick = () => overlay.remove();
    document.getElementById("et-cancel").onclick = () => overlay.remove();
    document.getElementById("et-save").onclick = async () => {
        const payload = {
            brand: store.brandId || "academy",
            name: document.getElementById("etf-name").value.trim(),
            color: document.getElementById("etf-color").value,
            default_capacity: parseInt(document.getElementById("etf-cap").value) || null,
            default_catering: document.getElementById("etf-catering").value.trim(),
        };
        if (!payload.name) { showToast("Naam is verplicht.", "error"); return; }
        const { error } = isEdit
            ? await supabase.from("event_types").update(payload).eq("id", item.id)
            : await supabase.from("event_types").insert([payload]);
        if (error) { showToast("Fout: " + error.message, "error"); return; }
        showToast("Opgeslagen.", "success");
        overlay.remove();
        refresh();
    };
}

// ─── 5. SESSIES & TIJDSLOTS ───────────────────────────────────────────────────
async function sectionSessies(el) {
    const { data: sessions } = await supabase.from("session_templates").select("*").order("start_time");

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Sessies & tijdslots</h2>
      <p>Standaard sessietemplates die hergebruikt worden bij events.</p>
      <button class="s-btn s-btn-primary" id="add-sess-btn">+ Sessie toevoegen</button>
    </div>
    <div id="sess-list">
      ${renderSessionsList(sessions || [])}
    </div>`;

    document.getElementById("add-sess-btn").onclick = () => openSessionModal(null, () => loadSection("sessies"));
    bindSessionActions(sessions || [], () => loadSection("sessies"));
}

function renderSessionsList(sessions) {
    if (!sessions.length) return `<div class="s-empty">Geen sessietemplates gevonden.</div>`;
    return `
    <div class="s-table-wrap">
      <table>
        <thead><tr><th>Naam</th><th>Start</th><th>Einde</th><th>Max. deelnemers</th><th></th></tr></thead>
        <tbody>
          ${sessions.map(s => `
            <tr>
              <td><strong>${s.name}</strong></td>
              <td>${s.start_time || "."}</td>
              <td>${s.end_time || "."}</td>
              <td>${s.max_participants || "."}</td>
              <td class="s-row-actions">
                <button class="s-btn-link edit-sess" data-id="${s.id}">Bewerken</button>
                <button class="s-btn-link del-sess" data-id="${s.id}">Verwijderen</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function bindSessionActions(sessions, refresh) {
    document.querySelectorAll(".edit-sess").forEach(btn => {
        btn.onclick = () => openSessionModal(sessions.find(s => s.id === btn.dataset.id), refresh);
    });
    document.querySelectorAll(".del-sess").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Sessietemplate verwijderen?")) return;
            await supabase.from("session_templates").delete().eq("id", btn.dataset.id);
            showToast("Verwijderd.", "success");
            refresh();
        };
    });
}

function openSessionModal(item, refresh) {
    const isEdit = !!item;
    const overlay = document.createElement("div");
    overlay.className = "s-modal-overlay";
    overlay.innerHTML = `
    <div class="s-modal">
      <div class="s-modal-header">
        <h3>${isEdit ? "Sessie bewerken" : "Nieuwe sessie"}</h3>
        <button class="s-modal-close" id="sess-close">✕</button>
      </div>
      <div class="s-grid-2">
        <div class="s-field" style="grid-column:1/-1">
          <label>Naam</label>
          <input id="sf-name" value="${item?.name || ""}" placeholder="bv. Ochtendsessie" />
        </div>
        <div class="s-field">
          <label>Starttijd</label>
          <input id="sf-start" type="time" value="${item?.start_time || ""}" />
        </div>
        <div class="s-field">
          <label>Eindtijd</label>
          <input id="sf-end" type="time" value="${item?.end_time || ""}" />
        </div>
        <div class="s-field">
          <label>Max. deelnemers</label>
          <input id="sf-max" type="number" value="${item?.max_participants || ""}" />
        </div>
      </div>
      <div class="s-modal-actions">
        <button class="s-btn s-btn-ghost" id="sess-cancel">Annuleren</button>
        <button class="s-btn s-btn-primary" id="sess-save">${isEdit ? "Opslaan" : "Aanmaken"}</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.getElementById("sess-close").onclick = () => overlay.remove();
    document.getElementById("sess-cancel").onclick = () => overlay.remove();
    document.getElementById("sess-save").onclick = async () => {
        const payload = {
            brand: store.brandId || "academy",
            name: document.getElementById("sf-name").value.trim(),
            start_time: document.getElementById("sf-start").value,
            end_time: document.getElementById("sf-end").value,
            max_participants: parseInt(document.getElementById("sf-max").value) || null,
        };
        if (!payload.name) { showToast("Naam is verplicht.", "error"); return; }
        const { error } = isEdit
            ? await supabase.from("session_templates").update(payload).eq("id", item.id)
            : await supabase.from("session_templates").insert([payload]);
        if (error) { showToast("Fout: " + error.message, "error"); return; }
        showToast("Opgeslagen.", "success");
        overlay.remove();
        refresh();
    };
}

// ─── 6. GEBRUIKERS & ROLLEN ───────────────────────────────────────────────────
async function sectionGebruikers(el) {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Gebruikers & rollen</h2>
      <p>Beheer toegang en rollen. Gebruikers worden uitgenodigd via Supabase.</p>
    </div>
    <div class="s-info-box">
      Nieuwe gebruikers uitnodigen: ga naar <strong>Supabase Dashboard → Authentication → Users → Invite user</strong>.
      Koppel daarna hier de juiste rol en het merk.
    </div>
    ${profiles?.length ? `
      <div class="s-table-wrap">
        <table>
          <thead><tr><th>E-mail</th><th>Naam</th><th>Merk</th><th>Rol</th><th>Aangemaakt</th><th></th></tr></thead>
          <tbody>
            ${profiles.map(p => `
              <tr>
                <td>${p.email || "."}</td>
                <td>${p.full_name || "."}</td>
                <td>
                  <select class="s-inline-select" data-uid="${p.id}" data-field="brand_id">
                    <option value="academy" ${p.brand_id === "academy" ? "selected" : ""}>Academy</option>
                    <option value="invest"  ${p.brand_id === "invest" ? "selected" : ""}>Invest</option>
                    <option value="fund"    ${p.brand_id === "fund" ? "selected" : ""}>Fund</option>
                  </select>
                </td>
                <td>
                  <select class="s-inline-select" data-uid="${p.id}" data-field="role">
                    <option value="admin"  ${p.role === "admin" ? "selected" : ""}>Admin</option>
                    <option value="ops"    ${p.role === "ops" ? "selected" : ""}>Ops</option>
                    <option value="viewer" ${p.role === "viewer" ? "selected" : ""}>Viewer</option>
                  </select>
                </td>
                <td>${p.created_at ? new Date(p.created_at).toLocaleDateString("nl-BE") : "."}</td>
                <td class="s-row-actions">
                  <button class="s-btn-link save-profile" data-uid="${p.id}">Opslaan</button>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<div class="s-empty">Geen gebruikers gevonden in de profiles tabel.</div>`}`;

    document.querySelectorAll(".save-profile").forEach(btn => {
        btn.onclick = async () => {
            const row = btn.closest("tr");
            const selects = row.querySelectorAll(".s-inline-select");
            const update = {};
            selects.forEach(s => update[s.dataset.field] = s.value);
            const { error } = await supabase.from("profiles").update(update).eq("id", btn.dataset.uid);
            if (error) { showToast("Fout: " + error.message, "error"); return; }
            showToast("Gebruiker bijgewerkt.", "success");
        };
    });
}

// ─── 7. NOTIFICATIES ─────────────────────────────────────────────────────────
async function sectionNotificaties(el) {
    const { data: templates } = await supabase.from("notification_templates").select("*");

    const getTemplate = (trigger) =>
        templates?.find(t => t.trigger_type === trigger && t.brand === (store.brandId || "academy"));

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Notificaties & e-mailtemplates</h2>
      <p>Configureer wat er verstuurd wordt en wanneer. Variabelen: <code>{{naam}}</code> <code>{{event}}</code> <code>{{datum}}</code> <code>{{locatie}}</code></p>
    </div>
    ${NOTIFICATION_TRIGGERS.map(trigger => {
        const t = getTemplate(trigger.key);
        return `
        <div class="s-card" id="notif-${trigger.key}">
          <div class="s-card-title-row">
            <div class="s-card-title">${trigger.label}</div>
            <label class="s-toggle">
              <input type="checkbox" id="notif-active-${trigger.key}" ${t?.is_active ? "checked" : ""} />
              <span class="s-toggle-slider"></span>
            </label>
          </div>
          <div class="s-field" style="margin-top:12px">
            <label>Onderwerpregel</label>
            <input id="notif-subject-${trigger.key}" value="${t?.subject || ""}" placeholder="Onderwerp van de e-mail" />
          </div>
          <div class="s-field">
            <label>Tekst</label>
            <textarea id="notif-body-${trigger.key}" rows="4" placeholder="Beste {{naam}}, ...">${t?.body || ""}</textarea>
          </div>
          <div class="s-actions">
            <button class="s-btn s-btn-primary" onclick="window.__saveNotif('${trigger.key}')">Opslaan</button>
          </div>
        </div>`;
    }).join("")}`;

    window.__saveNotif = async (triggerKey) => {
        const brand = store.brandId || "academy";
        const payload = {
            brand,
            trigger_type: triggerKey,
            subject: document.getElementById(`notif-subject-${triggerKey}`).value,
            body: document.getElementById(`notif-body-${triggerKey}`).value,
            is_active: document.getElementById(`notif-active-${triggerKey}`).checked,
            updated_at: new Date().toISOString(),
        };
        const existing = templates?.find(t => t.trigger_type === triggerKey && t.brand === brand);
        const { error } = existing
            ? await supabase.from("notification_templates").update(payload).eq("id", existing.id)
            : await supabase.from("notification_templates").insert([payload]);
        if (error) { showToast("Fout: " + error.message, "error"); return; }
        showToast("Template opgeslagen.", "success");
    };
}

// ─── 8. CATERING ─────────────────────────────────────────────────────────────
async function sectionCatering(el) {
    const { data: options } = await supabase.from("catering_options").select("*").order("name");

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Catering opties</h2>
      <p>Centraal beheer van cateringopties die gekoppeld worden aan events.</p>
      <button class="s-btn s-btn-primary" id="add-cat-btn">+ Optie toevoegen</button>
    </div>
    <div id="cat-list">
      ${renderCateringList(options || [])}
    </div>`;

    document.getElementById("add-cat-btn").onclick = () => openCateringModal(null, () => loadSection("catering"));
    bindCateringActions(options || [], () => loadSection("catering"));
}

function renderCateringList(options) {
    if (!options.length) return `<div class="s-empty">Geen cateringopties gevonden.</div>`;
    return `
    <div class="s-table-wrap">
      <table>
        <thead><tr><th>Naam</th><th>Beschrijving</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${options.map(o => `
            <tr>
              <td><strong>${o.name}</strong></td>
              <td>${o.description || "."}</td>
              <td><span class="s-badge ${o.is_active ? "s-badge-active" : "s-badge-off"}">${o.is_active ? "Actief" : "Inactief"}</span></td>
              <td class="s-row-actions">
                <button class="s-btn-link edit-cat" data-id="${o.id}">Bewerken</button>
                <button class="s-btn-link toggle-cat" data-id="${o.id}" data-active="${o.is_active}">${o.is_active ? "Deactiveren" : "Activeren"}</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function bindCateringActions(options, refresh) {
    document.querySelectorAll(".edit-cat").forEach(btn => {
        btn.onclick = () => openCateringModal(options.find(o => o.id === btn.dataset.id), refresh);
    });
    document.querySelectorAll(".toggle-cat").forEach(btn => {
        btn.onclick = async () => {
            await supabase.from("catering_options").update({ is_active: btn.dataset.active === "true" ? false : true }).eq("id", btn.dataset.id);
            showToast("Status bijgewerkt.", "success");
            refresh();
        };
    });
}

function openCateringModal(item, refresh) {
    const isEdit = !!item;
    const overlay = document.createElement("div");
    overlay.className = "s-modal-overlay";
    overlay.innerHTML = `
    <div class="s-modal">
      <div class="s-modal-header">
        <h3>${isEdit ? "Catering bewerken" : "Nieuwe cateringoptie"}</h3>
        <button class="s-modal-close" id="cat-close">✕</button>
      </div>
      <div class="s-field">
        <label>Naam</label>
        <input id="cf-name" value="${item?.name || ""}" placeholder="bv. Drank & lunch" />
      </div>
      <div class="s-field">
        <label>Beschrijving</label>
        <textarea id="cf-desc" rows="2">${item?.description || ""}</textarea>
      </div>
      <div class="s-modal-actions">
        <button class="s-btn s-btn-ghost" id="cat-cancel">Annuleren</button>
        <button class="s-btn s-btn-primary" id="cat-save">${isEdit ? "Opslaan" : "Aanmaken"}</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.getElementById("cat-close").onclick = () => overlay.remove();
    document.getElementById("cat-cancel").onclick = () => overlay.remove();
    document.getElementById("cat-save").onclick = async () => {
        const payload = {
            brand: store.brandId || "academy",
            name: document.getElementById("cf-name").value.trim(),
            description: document.getElementById("cf-desc").value.trim(),
        };
        if (!payload.name) { showToast("Naam is verplicht.", "error"); return; }
        const { error } = isEdit
            ? await supabase.from("catering_options").update(payload).eq("id", item.id)
            : await supabase.from("catering_options").insert([payload]);
        if (error) { showToast("Fout: " + error.message, "error"); return; }
        showToast("Opgeslagen.", "success");
        overlay.remove();
        refresh();
    };
}

// ─── 9. EXPORT & INTEGRATIES ──────────────────────────────────────────────────
async function sectionExport(el) {
    const brand = store.brandId || "academy";
    const { data: settings } = await supabase.from("app_settings").select("*").eq("brand", brand);
    const getSetting = key => settings?.find(s => s.key === key)?.value || "";

    const exportFields = ["title", "location", "event_date", "start_at", "end_at", "capacity", "program", "participant_group", "catering", "status"];

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Export & integraties</h2>
      <p>Configureer exportinstellingen en externe koppelingen.</p>
    </div>

    <div class="s-card">
      <div class="s-card-title">CSV Export</div>
      <div class="s-field">
        <label>Standaard exportvelden</label>
        <div class="s-checkboxes">
          ${exportFields.map(f => `
            <label class="s-checkbox">
              <input type="checkbox" class="export-field-cb" value="${f}"
                ${(getSetting("export_fields") || exportFields.join(",")).split(",").includes(f) ? "checked" : ""} />
              ${f}
            </label>`).join("")}
        </div>
      </div>
      <div class="s-grid-2">
        <div class="s-field">
          <label>Datumformaat</label>
          <select id="exp-dateformat">
            <option value="DD/MM/YYYY" ${getSetting("export_dateformat") === "DD/MM/YYYY" ? "selected" : ""}>DD/MM/YYYY</option>
            <option value="ISO"        ${getSetting("export_dateformat") === "ISO" ? "selected" : ""}>ISO 8601</option>
          </select>
        </div>
        <div class="s-field">
          <label>Bestandsnaam patroon</label>
          <input id="exp-filename" value="${getSetting("export_filename") || "archer_events_{{datum}}.csv"}" />
        </div>
      </div>
      <div class="s-actions">
        <button class="s-btn s-btn-primary" id="save-export-btn">Opslaan</button>
      </div>
    </div>

    <div class="s-card">
      <div class="s-card-title">Integraties</div>
      <div class="s-field">
        <label>Webhook URL</label>
        <input id="exp-webhook" type="url" value="${getSetting("webhook_url") || ""}" placeholder="https://hooks.zapier.com/..." />
      </div>
      <div class="s-field">
        <label>Read-only API key (voor externe tools)</label>
        <div style="display:flex;gap:8px">
          <input id="exp-apikey" value="${getSetting("api_key") || ""}" readonly style="font-family:monospace;font-size:12px" />
          <button class="s-btn s-btn-ghost" id="gen-apikey-btn">Genereren</button>
        </div>
      </div>
      <div class="s-actions">
        <button class="s-btn s-btn-primary" id="save-integrations-btn">Opslaan</button>
      </div>
    </div>`;

    document.getElementById("gen-apikey-btn").onclick = () => {
        document.getElementById("exp-apikey").value = "ak_" + crypto.randomUUID().replace(/-/g, "");
    };

    document.getElementById("save-export-btn").onclick = async () => {
        const fields = [...document.querySelectorAll(".export-field-cb:checked")].map(c => c.value).join(",");
        const pairs = [
            ["export_fields", fields],
            ["export_dateformat", document.getElementById("exp-dateformat").value],
            ["export_filename", document.getElementById("exp-filename").value],
        ];
        for (const [key, value] of pairs)
            await supabase.from("app_settings").upsert({ brand, key, value }, { onConflict: "brand,key" });
        showToast("Export instellingen opgeslagen.", "success");
    };

    document.getElementById("save-integrations-btn").onclick = async () => {
        const pairs = [
            ["webhook_url", document.getElementById("exp-webhook").value],
            ["api_key", document.getElementById("exp-apikey").value],
        ];
        for (const [key, value] of pairs)
            await supabase.from("app_settings").upsert({ brand, key, value }, { onConflict: "brand,key" });
        showToast("Integraties opgeslagen.", "success");
    };
}

// ─── 10. AUDIT LOG ────────────────────────────────────────────────────────────
async function sectionAuditLog(el) {
    const { data: logs } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

    el.innerHTML = `
    <div class="s-section-header">
      <h2>Audit log</h2>
      <p>Overzicht van de laatste 100 kritieke acties.</p>
    </div>
    ${logs?.length ? `
      <div class="s-table-wrap">
        <table>
          <thead><tr><th>Tijdstip</th><th>Gebruiker</th><th>Actie</th><th>Tabel</th><th>Record ID</th></tr></thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td style="white-space:nowrap;font-size:12px">${new Date(l.created_at).toLocaleString("nl-BE")}</td>
                <td style="font-size:12px">${l.actor_id?.slice(0, 8) || "."}</td>
                <td><span class="s-badge s-badge-action">${l.action}</span></td>
                <td style="font-size:12px;color:#999">${l.table_name || "."}</td>
                <td style="font-size:11px;color:#bbb;font-family:monospace">${l.record_id?.slice(0, 12) || "."}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<div class="s-empty">Geen audit log entries gevonden.</div>`}`;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function renderSimpleList(items, fields, labels, prefix) {
    if (!items.length) return `<div class="s-empty">Geen items gevonden.</div>`;
    return `
    <div class="s-table-wrap">
      <table>
        <thead><tr>${labels.map(l => `<th>${l}</th>`).join("")}<th>Status</th><th></th></tr></thead>
        <tbody>
          ${items.map(item => `
            <tr>
              ${fields.map(f => `<td>${item[f] || "."}</td>`).join("")}
              <td><span class="s-badge ${item.is_active !== false ? "s-badge-active" : "s-badge-off"}">${item.is_active !== false ? "Actief" : "Inactief"}</span></td>
              <td class="s-row-actions">
                <button class="s-btn-link edit-${prefix}" data-id="${item.id}">Bewerken</button>
                <button class="s-btn-link toggle-${prefix}" data-id="${item.id}" data-active="${item.is_active}">${item.is_active !== false ? "Deactiveren" : "Activeren"}</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function bindSimpleActions(prefix, items, table, fields, labels, refresh) {
    document.querySelectorAll(`.edit-${prefix}`).forEach(btn => {
        btn.onclick = () => openSimpleModal(table, items.find(i => i.id === btn.dataset.id), fields, labels, refresh);
    });
    document.querySelectorAll(`.toggle-${prefix}`).forEach(btn => {
        btn.onclick = async () => {
            await supabase.from(table).update({ is_active: btn.dataset.active === "true" ? false : true }).eq("id", btn.dataset.id);
            showToast("Status bijgewerkt.", "success");
            refresh();
        };
    });
}

function openSimpleModal(table, item, fields, labels, refresh) {
    const isEdit = !!item;
    const overlay = document.createElement("div");
    overlay.className = "s-modal-overlay";
    overlay.innerHTML = `
    <div class="s-modal">
      <div class="s-modal-header">
        <h3>${isEdit ? "Bewerken" : "Nieuw item"}</h3>
        <button class="s-modal-close" id="sm-close">✕</button>
      </div>
      ${fields.map((f, i) => `
        <div class="s-field">
          <label>${labels[i]}</label>
          <input id="smf-${f}" value="${item?.[f] || ""}" />
        </div>`).join("")}
      <div class="s-modal-actions">
        <button class="s-btn s-btn-ghost" id="sm-cancel">Annuleren</button>
        <button class="s-btn s-btn-primary" id="sm-save">${isEdit ? "Opslaan" : "Aanmaken"}</button>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.getElementById("sm-close").onclick = () => overlay.remove();
    document.getElementById("sm-cancel").onclick = () => overlay.remove();
    document.getElementById("sm-save").onclick = async () => {
        const payload = { brand: store.brandId || "academy" };
        fields.forEach(f => payload[f] = document.getElementById(`smf-${f}`)?.value?.trim());
        if (!payload[fields[0]]) { showToast("Naam is verplicht.", "error"); return; }
        const { error } = isEdit
            ? await supabase.from(table).update(payload).eq("id", item.id)
            : await supabase.from(table).insert([payload]);
        if (error) { showToast("Fout: " + error.message, "error"); return; }
        showToast("Opgeslagen.", "success");
        overlay.remove();
        refresh();
    };
}
