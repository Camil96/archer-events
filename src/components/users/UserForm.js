import { esc, showToast } from "../../utils.js";

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

function formatModalError(error) {
  const message = String(error?.message || "").trim();
  if (!message) return "Opslaan mislukt. Probeer het opnieuw.";
  if (message.toLowerCase().includes("schema cache")) {
    return "Instellingen voor gebruikerskolommen ontbreken nog in Supabase. Voer eerst de SQL-migratie uit.";
  }
  return message;
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

          <div id="uf-invite-result" class="cp-col-span-2" style="display:none;padding-top:8px;">
            <p style="margin:0 0 8px;font-size:0.86rem;color:#2d3036;">Kopieer deze link en stuur hem via e-mail of chat naar de gebruiker.</p>
            <input id="uf-invite-link" type="text" readonly value="" style="margin-bottom:8px;" />
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <button id="uf-copy-invite" type="button" class="cp-btn cp-btn-ghost">Kopieer link</button>
              <button id="uf-toggle-email-text" type="button" class="cp-btn-link" style="padding:0;">Toon e-mailtekst</button>
            </div>
            <textarea id="uf-email-text" rows="8" readonly style="display:none;margin-top:8px;font-size:0.82rem;"></textarea>
          </div>
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
  const inviteResultEl = overlay.querySelector("#uf-invite-result");
  const inviteLinkInput = overlay.querySelector("#uf-invite-link");
  const copyInviteButton = overlay.querySelector("#uf-copy-invite");
  const toggleEmailTextButton = overlay.querySelector("#uf-toggle-email-text");
  const emailTextArea = overlay.querySelector("#uf-email-text");

  const setError = (message = "") => {
    if (errorEl) errorEl.textContent = String(message || "");
  };

  const setPending = (pending) => {
    const isPending = Boolean(pending);
    submitButton.disabled = isPending;
    submitButton.innerHTML = isPending
      ? '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:8px;vertical-align:-2px;"></span>Bezig...'
      : esc(submitLabel);
  };

  const setInviteResult = ({ inviteLink = "", emailSubject = "", emailText = "" } = {}) => {
    const safeLink = String(inviteLink || "").trim();
    if (!safeLink) return;

    inviteResultEl.style.display = "";
    inviteLinkInput.value = safeLink;
    emailTextArea.value = [`Onderwerp: ${emailSubject || "Je uitnodiging voor Archer Events"}`, "", emailText || ""].join("\n");
    emailTextArea.style.display = "none";
    toggleEmailTextButton.textContent = "Toon e-mailtekst";
  };

  copyInviteButton?.addEventListener("click", async () => {
    const link = String(inviteLinkInput?.value || "").trim();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Uitnodigingslink gegenereerd en gekopieerd naar je klembord.", "success");
    } catch {
      setError("Kon de link niet kopieren. Kopieer handmatig uit het veld.");
    }
  });

  toggleEmailTextButton?.addEventListener("click", () => {
    const isHidden = emailTextArea.style.display === "none";
    emailTextArea.style.display = isHidden ? "" : "none";
    toggleEmailTextButton.textContent = isHidden ? "Verberg e-mailtekst" : "Toon e-mailtekst";
  });

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
      const keepOpen = await onSubmit?.(payload, { setError, setPending, close, setInviteResult });
      if (keepOpen !== false) close();
    } catch (error) {
      setError(formatModalError(error));
      setPending(false);
    }
  });
}
