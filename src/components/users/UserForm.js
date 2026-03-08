import { esc } from "../../utils.js";

const ROLE_OPTIONS = ["superadmin", "admin", "operations", "viewer"];
const BRAND_OPTIONS = [
  { key: "academy", label: "Academy" },
  { key: "invest", label: "Invest" },
  { key: "fund", label: "Fund" },
];

function normalizeBrandAccess(value) {
  if (!Array.isArray(value)) return ["academy", "invest", "fund"];
  const list = [...new Set(value.map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean))];
  return list.length ? list : ["academy", "invest", "fund"];
}

export function openUserFormModal({
  title = "Gebruiker",
  description = "",
  submitLabel = "Opslaan",
  initialValues = {},
  isEdit = false,
  onSubmit,
} = {}) {
  const role = String(initialValues.role || "viewer").trim().toLowerCase();
  const status = String(initialValues.status || "invited").trim().toLowerCase();
  const brandAccess = normalizeBrandAccess(initialValues.brand_access);

  const overlay = document.createElement("div");
  overlay.className = "cp-modal-overlay";
  overlay.innerHTML = `
    <div class="cp-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="cp-modal-head">
        <div>
          <h3>${esc(title)}</h3>
          <p>${esc(description || "Vul de gebruikersgegevens in.")}</p>
        </div>
        <button class="cp-modal-close" type="button" data-action="close">✕</button>
      </header>

      <div class="cp-modal-body">
        <div class="cp-grid cp-grid-2">
          <label class="cp-field">
            <span>Voornaam</span>
            <input id="uf-first-name" type="text" value="${esc(initialValues.first_name || "")}" placeholder="Voornaam" />
          </label>

          <label class="cp-field">
            <span>Achternaam</span>
            <input id="uf-last-name" type="text" value="${esc(initialValues.last_name || "")}" placeholder="Achternaam" />
          </label>

          <label class="cp-field cp-col-span-2">
            <span>E-mail</span>
            <input id="uf-email" type="email" value="${esc(initialValues.email || "")}" placeholder="naam@bedrijf.be" ${isEdit ? "readonly" : ""} />
          </label>

          <label class="cp-field">
            <span>Rol</span>
            <select id="uf-role">
              ${ROLE_OPTIONS.map((option) => `<option value="${option}" ${role === option ? "selected" : ""}>${option}</option>`).join("")}
            </select>
          </label>

          <label class="cp-field">
            <span>Status</span>
            <select id="uf-status">
              <option value="invited" ${status === "invited" ? "selected" : ""}>Uitgenodigd</option>
              <option value="active" ${status === "active" ? "selected" : ""}>Actief</option>
              <option value="disabled" ${status === "disabled" ? "selected" : ""}>Gedeactiveerd</option>
            </select>
          </label>

          <fieldset class="cp-field cp-col-span-2">
            <span>Merktoegang</span>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              ${BRAND_OPTIONS.map((brand) => {
                const checked = brandAccess.includes(brand.key) ? "checked" : "";
                return `<label class="cp-inline-toggle"><input type="checkbox" value="${brand.key}" class="uf-brand-access" ${checked}><span>${brand.label}</span></label>`;
              }).join("")}
            </div>
          </fieldset>

          <p id="uf-error" class="cp-col-span-2" style="margin:0;color:#b91c1c;min-height:1.2em;"></p>
        </div>
      </div>

      <footer class="cp-modal-foot">
        <button class="cp-btn cp-btn-ghost" type="button" data-action="close">Annuleren</button>
        <button class="cp-btn cp-btn-primary" type="button" id="uf-submit">${esc(submitLabel)}</button>
      </footer>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  overlay.querySelectorAll("[data-action='close']").forEach((button) => {
    button.addEventListener("click", close);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  const errorEl = overlay.querySelector("#uf-error");
  const submitButton = overlay.querySelector("#uf-submit");

  const setError = (message = "") => {
    if (errorEl) errorEl.textContent = String(message || "");
  };

  const setPending = (pending) => {
    const isPending = Boolean(pending);
    submitButton.disabled = isPending;
    submitButton.textContent = isPending ? "Bezig..." : submitLabel;
  };

  submitButton?.addEventListener("click", async () => {
    const email = overlay.querySelector("#uf-email")?.value?.trim()?.toLowerCase() || "";
    const roleValue = overlay.querySelector("#uf-role")?.value || "viewer";
    const statusValue = overlay.querySelector("#uf-status")?.value || "invited";
    const selectedBrands = [...overlay.querySelectorAll(".uf-brand-access:checked")].map((input) => input.value);

    if (!email) {
      setError("E-mailadres is verplicht.");
      return;
    }

    if (!selectedBrands.length) {
      setError("Selecteer minstens één merk.");
      return;
    }

    setError("");
    setPending(true);

    const payload = {
      first_name: overlay.querySelector("#uf-first-name")?.value?.trim() || "",
      last_name: overlay.querySelector("#uf-last-name")?.value?.trim() || "",
      email,
      role: roleValue,
      status: statusValue,
      brand_access: selectedBrands,
    };

    try {
      const keepOpen = await onSubmit?.(payload, { setError, setPending, close });
      if (keepOpen !== false) close();
    } catch (error) {
      setError(error?.message || "Opslaan mislukt.");
      setPending(false);
    }
  });
}
