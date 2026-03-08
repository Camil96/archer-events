import { getCurrentAppUser } from "../../auth.js";
import { canManageUsers } from "../../authPermissions.js";
import { createUserInvite, resendUserInvite } from "../../api/invites.js";
import { listUsers, toggleUserStatus, updateUser } from "../../api/users.js";
import { openUserFormModal } from "../../components/users/UserForm.js";
import { esc, showToast } from "../../utils.js";

const state = {
  search: "",
  role: "",
  status: "",
  latestInvite: null,
};

function getErrorMessage(error, fallback) {
  const message = String(error?.message || "").trim();
  return message || fallback;
}

function renderLoading() {
  return '<div class="spinner-wrap"><div class="spinner"></div></div>';
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status) {
  const key = String(status || "").trim().toLowerCase();
  if (key === "active") return '<span class="badge badge-green">Actief</span>';
  if (key === "disabled") return '<span class="badge badge-red">Gedeactiveerd</span>';
  return '<span class="badge badge-yellow">Uitgenodigd</span>';
}

function roleOptions(selected) {
  const roles = ["", "superadmin", "admin", "operations", "viewer"];
  return roles
    .map((role) => {
      const label = role ? role : "Alle rollen";
      return `<option value="${role}" ${selected === role ? "selected" : ""}>${label}</option>`;
    })
    .join("");
}

function statusOptions(selected) {
  const list = [
    { value: "", label: "Alle statussen" },
    { value: "active", label: "Actief" },
    { value: "invited", label: "Uitgenodigd" },
    { value: "disabled", label: "Gedeactiveerd" },
  ];

  return list
    .map((entry) => `<option value="${entry.value}" ${selected === entry.value ? "selected" : ""}>${entry.label}</option>`)
    .join("");
}

async function renderUserTable(container, currentUser) {
  container.innerHTML = renderLoading();

  let users = [];
  try {
    users = await listUsers({
      search: state.search,
      role: state.role,
      status: state.status,
    });
  } catch (error) {
    const message = getErrorMessage(error, "Gebruikers laden mislukt.");
    container.innerHTML = `
      <div class="cp-card">
        <h3>Kon gebruikers niet laden</h3>
        <p class="muted">${esc(message)}</p>
      </div>
    `;
    showToast(message, "error");
    return;
  }

  const invitePreview = import.meta.env.DEV && state.latestInvite
    ? `
      <article class="cp-card" style="margin-bottom:16px;">
        <header class="cp-card-head">
          <div>
            <h3>Uitnodiging klaar</h3>
            <p>Kopieer de uitnodigingslink en deel deze veilig met de gebruiker.</p>
          </div>
          <button class="cp-btn cp-btn-ghost" id="um-copy-invite" type="button">Kopieer link</button>
        </header>
        <div class="cp-field">
          <span>Invite-link</span>
          <input id="um-invite-link" type="text" readonly value="${esc(state.latestInvite.inviteLink || "")}" />
        </div>
      </article>
    `
    : "";

  container.innerHTML = `
    <div class="cp-stack">
      <div class="cp-section-head" style="margin-bottom:12px;">
        <div>
          <p class="cp-eyebrow">Instellingen</p>
          <h2>Gebruikersbeheer</h2>
          <p>Beheer gebruikers, rollen, merktoegang en uitnodigingen volledig vanuit de app.</p>
        </div>
        <div class="cp-section-head-actions">
          <button class="cp-btn cp-btn-primary" id="um-invite-user" type="button">Nieuwe gebruiker uitnodigen</button>
        </div>
      </div>

      ${invitePreview}

      <article class="cp-card">
        <div class="filter-bar" style="margin:0;">
          <input id="um-search" class="filter-input" type="search" placeholder="Zoek op naam of e-mail" value="${esc(state.search)}" />
          <select id="um-role" class="filter-select">${roleOptions(state.role)}</select>
          <select id="um-status" class="filter-select">${statusOptions(state.status)}</select>
          <button id="um-reset" class="btn-ghost filter-reset-btn" type="button">Alle filters resetten</button>
        </div>
      </article>

      ${
        users.length
          ? `
          <div class="cp-table-card">
            <table class="cp-table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Rol</th>
                  <th>Status</th>
                  <th>Merktoegang</th>
                  <th>Uitgenodigd op</th>
                  <th>Laatst actief</th>
                  <th class="cp-ta-right">Acties</th>
                </tr>
              </thead>
              <tbody>
                ${users
                  .map((user) => {
                    const canResend = String(user.status || "").toLowerCase() === "invited";
                    const canDisable = String(user.id) !== String(currentUser?.id || "");

                    return `
                      <tr>
                        <td>${esc(user.email || "-")}</td>
                        <td>${esc(user.role || "viewer")}</td>
                        <td>${statusBadge(user.status)}</td>
                        <td>${esc((user.brand_access || []).join(", ") || "-")}</td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>${formatDate(user.last_sign_in_at || user.updated_at)}</td>
                        <td class="cp-ta-right">
                          <div class="cp-row-actions cp-row-actions-end" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;opacity:1;visibility:visible;">
                            <button class="cp-btn-link" data-action="edit-user" data-id="${user.id}" type="button" aria-label="Gebruiker bewerken">Bewerken</button>
                            ${
                              canDisable
                                ? `<button class="cp-btn-link" data-action="toggle-user" data-id="${user.id}" data-status="${esc(
                                    user.status || ""
                                  )}" type="button">${
                                    String(user.status || "").toLowerCase() === "disabled" ? "Reactiveren" : "Deactiveren"
                                  }</button>`
                                : ""
                            }
                            ${
                              canResend
                                ? `<button class="cp-btn-link" data-action="resend-invite" data-id="${user.id}" type="button" aria-label="Uitnodiging opnieuw versturen">Uitnodiging opnieuw</button>`
                                : ""
                            }
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
          : `
          <div class="cp-card" style="text-align:center;">
            <h3>Nog geen gebruikers</h3>
            <p class="muted">Nog geen gebruikers gevonden. Nodig iemand uit om te starten.</p>
          </div>
        `
      }
    </div>
  `;

  bindEvents(container, users, currentUser);
}

function bindEvents(container, users, currentUser) {
  container.querySelector("#um-search")?.addEventListener("input", async (event) => {
    state.search = event.target.value.trim();
    await renderUserTable(container, currentUser);
  });

  container.querySelector("#um-role")?.addEventListener("change", async (event) => {
    state.role = event.target.value;
    await renderUserTable(container, currentUser);
  });

  container.querySelector("#um-status")?.addEventListener("change", async (event) => {
    state.status = event.target.value;
    await renderUserTable(container, currentUser);
  });

  container.querySelector("#um-reset")?.addEventListener("click", async () => {
    state.search = "";
    state.role = "";
    state.status = "";
    await renderUserTable(container, currentUser);
  });

  container.querySelector("#um-copy-invite")?.addEventListener("click", async () => {
    const link = state.latestInvite?.inviteLink || "";
    if (!link) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link).catch(() => null);
    }
    showToast("Invite-link gekopieerd.", "success");
  });

  container.querySelector("#um-invite-user")?.addEventListener("click", () => {
    openUserFormModal({
      title: "Nieuwe gebruiker uitnodigen",
      description: "De gebruiker ontvangt een persoonlijke uitnodigingslink om een wachtwoord te kiezen.",
      submitLabel: "Uitnodiging versturen",
      initialValues: {
        role: "viewer",
        status: "invited",
        brand_access: ["academy", "invest", "fund"],
      },
      onSubmit: async (payload, helpers) => {
        const invite = await createUserInvite({
          email: payload.email,
          firstName: payload.first_name,
          lastName: payload.last_name,
          role: payload.role,
          brandAccess: payload.brand_access,
          invitedBy: currentUser?.id || null,
        });

        state.latestInvite = invite;
        showToast(`Uitnodiging verstuurd naar ${payload.email}.`, "success");
        if (!invite?.emailDelivery?.delivered) {
          showToast("Mailservice niet beschikbaar. Kopieer de invite-link hieronder en deel die handmatig.", "warning");
        }
        if (import.meta.env.DEV && invite?.inviteLink) {
          console.log("[invite-dev] kopieer link:", invite.inviteLink);
        }
        await renderUserTable(container, currentUser);
        helpers.setPending(false);
        return true;
      },
    });
  });

  container.querySelectorAll("[data-action='edit-user']").forEach((button) => {
    button.addEventListener("click", () => {
      const user = users.find((entry) => String(entry.id) === String(button.dataset.id));
      if (!user) return;

      openUserFormModal({
        title: "Gebruiker bewerken",
        description: "Pas rol, status of merktoegang aan.",
        submitLabel: "Opslaan",
        initialValues: user,
        isEdit: true,
        onSubmit: async (payload, helpers) => {
          await updateUser(user.id, {
            first_name: payload.first_name,
            last_name: payload.last_name,
            role: payload.role,
            status: payload.status,
            brand_access: payload.brand_access,
          });

          showToast("Gebruiker bijgewerkt.", "success");
          await renderUserTable(container, currentUser);
          helpers.setPending(false);
          return true;
        },
      });
    });
  });

  container.querySelectorAll("[data-action='toggle-user']").forEach((button) => {
    button.addEventListener("click", async () => {
      const user = users.find((entry) => String(entry.id) === String(button.dataset.id));
      if (!user) return;

      const currentStatus = String(user.status || "").toLowerCase();
      const nextStatus = currentStatus === "disabled" ? "active" : "disabled";

      await toggleUserStatus(user.id, nextStatus);
      showToast(nextStatus === "active" ? "Gebruiker geactiveerd." : "Gebruiker gedeactiveerd.", "success");
      await renderUserTable(container, currentUser);
    });
  });

  container.querySelectorAll("[data-action='resend-invite']").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const userId = button.dataset.id;
        const invite = await resendUserInvite(userId, { invitedBy: currentUser?.id || null });
        state.latestInvite = invite;
        showToast("Uitnodiging opnieuw verstuurd.", "success");
        if (!invite?.emailDelivery?.delivered) {
          showToast("Mailservice niet beschikbaar. Kopieer de invite-link hieronder en deel die handmatig.", "warning");
        }
        if (import.meta.env.DEV && invite?.inviteLink) {
          console.log("[invite-dev] kopieer link:", invite.inviteLink);
        }
        await renderUserTable(container, currentUser);
      } catch (error) {
        showToast(getErrorMessage(error, "Uitnodiging opnieuw versturen mislukt."), "error");
      }
    });
  });
}

export async function renderUserManagement(container, options = {}) {
  const currentUser = options.currentUser || getCurrentAppUser();

  if (!canManageUsers(currentUser)) {
    container.innerHTML = `
      <div class="cp-card">
        <h3>Geen toegang</h3>
        <p class="muted">Alleen superadmins en admins kunnen gebruikers beheren.</p>
      </div>
    `;
    return;
  }

  await renderUserTable(container, currentUser);
}
