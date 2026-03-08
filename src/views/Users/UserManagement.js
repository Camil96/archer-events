import { getCurrentAppUser } from "../../auth.js";
import { canManageUsers } from "../../authPermissions.js";
import { createUserInvite, resendUserInvite } from "../../api/invites.js";
import { deleteUser, listUsers, toggleUserStatus, updateUser } from "../../api/users.js";
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

async function copyTextToClipboard(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (!navigator?.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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

function confirmDeleteUser(user) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "cp-modal-overlay";
    overlay.innerHTML = `
      <div class="cp-modal" role="dialog" aria-modal="true" aria-label="Gebruiker verwijderen">
        <header class="cp-modal-head">
          <div>
            <h3>Gebruiker verwijderen</h3>
            <p>Weet je zeker dat je deze gebruiker definitief wilt verwijderen? Dit verwijdert ook zijn uitnodiging en eventuele rechten.</p>
          </div>
        </header>
        <div class="cp-modal-body">
          <p style="margin:0;color:#2d3036;"><strong>${esc(user?.email || "Onbekende gebruiker")}</strong></p>
        </div>
        <footer class="cp-modal-foot">
          <button class="cp-btn cp-btn-ghost" type="button" data-action="cancel-delete">Annuleren</button>
          <button class="cp-btn cp-btn-primary" type="button" data-action="confirm-delete" style="background:#c53b45;border-color:#c53b45;">Gebruiker verwijderen</button>
        </footer>
      </div>
    `;

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
    });

    overlay.querySelector("[data-action='cancel-delete']")?.addEventListener("click", () => close(false));
    overlay.querySelector("[data-action='confirm-delete']")?.addEventListener("click", () => close(true));
    document.body.appendChild(overlay);
  });
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

  const invitePreview = state.latestInvite
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
                  <th class="cp-ta-right um-actions-col">Acties</th>
                </tr>
              </thead>
              <tbody>
                ${users
                  .map((user) => {
                    const canResend = String(user.status || "").toLowerCase() === "invited";
                    const canDisable = String(user.id) !== String(currentUser?.id || "");
                    const canDelete = String(user.id) !== String(currentUser?.id || "");

                    return `
                      <tr>
                        <td>${esc(user.email || "-")}</td>
                        <td>${esc(user.role || "viewer")}</td>
                        <td>${statusBadge(user.status)}</td>
                        <td>${esc((user.brand_access || []).join(", ") || "-")}</td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>${formatDate(user.last_sign_in_at || user.updated_at)}</td>
                        <td class="cp-ta-right um-actions-cell">
                          <div class="cp-row-actions cp-row-actions-end um-actions">
                            <button class="cp-btn-link um-action-btn" data-action="edit-user" data-id="${user.id}" type="button" aria-label="Gebruiker bewerken">Bewerken</button>
                            ${
                              canDisable
                                ? `<button class="cp-btn-link um-action-btn" data-action="toggle-user" data-id="${user.id}" data-status="${esc(
                                    user.status || ""
                                  )}" type="button">${
                                    String(user.status || "").toLowerCase() === "disabled" ? "Reactiveren" : "Deactiveren"
                                  }</button>`
                                : ""
                            }
                            ${
                              canResend
                                ? `<button class="cp-btn-link um-action-btn" data-action="resend-invite" data-id="${user.id}" type="button" aria-label="Uitnodiging opnieuw versturen">Uitnodiging opnieuw</button>`
                                : ""
                            }
                            ${
                              canDelete
                                ? `<button class="cp-btn-link cp-btn-link-danger um-action-btn" data-action="delete-user" data-id="${user.id}" type="button" aria-label="Gebruiker verwijderen">Verwijderen</button>`
                                : `<button class="cp-btn-link cp-btn-link-danger um-action-btn is-disabled" type="button" disabled title="Je kan jezelf niet verwijderen">Verwijderen</button>`
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
        helpers.setInviteResult({
          inviteLink: invite?.inviteLink || "",
          emailSubject: invite?.emailTemplate?.subject || "",
          emailText: invite?.emailTemplate?.text || "",
        });
        const copied = await copyTextToClipboard(invite?.inviteLink || "");
        if (invite?.inviteLink && copied) {
          showToast("Uitnodigingslink gegenereerd. Link gekopieerd naar clipboard.", "success");
        } else if (invite?.inviteLink) {
          showToast("Uitnodigingslink gegenereerd. Kopieer de link handmatig.", "success");
        } else {
          showToast("Uitnodigingslink gegenereerd.", "success");
        }
        if (import.meta.env.DEV && invite?.inviteLink) {
          console.log("[invite-dev] kopieer link:", invite.inviteLink);
        }
        await renderUserTable(container, currentUser);
        helpers.setPending(false);
        return false;
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
      try {
        const user = users.find((entry) => String(entry.id) === String(button.dataset.id));
        if (!user) return;

        const currentStatus = String(user.status || "").toLowerCase();
        const nextStatus = currentStatus === "disabled" ? "active" : "disabled";

        await toggleUserStatus(user.id, nextStatus);
        showToast(nextStatus === "active" ? "Gebruiker geactiveerd." : "Gebruiker gedeactiveerd.", "success");
        await renderUserTable(container, currentUser);
      } catch (error) {
        showToast(getErrorMessage(error, "Status wijzigen mislukt."), "error");
      }
    });
  });

  container.querySelectorAll("[data-action='resend-invite']").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const userId = button.dataset.id;
        const invite = await resendUserInvite(userId, { invitedBy: currentUser?.id || null });
        state.latestInvite = invite;
        const copied = await copyTextToClipboard(invite?.inviteLink || "");
        showToast(
          copied
            ? "Nieuwe uitnodigingslink gegenereerd. Link gekopieerd naar clipboard."
            : "Nieuwe uitnodigingslink gegenereerd. Kopieer de link handmatig.",
          "success"
        );
        if (import.meta.env.DEV && invite?.inviteLink) {
          console.log("[invite-dev] kopieer link:", invite.inviteLink);
        }
        await renderUserTable(container, currentUser);
      } catch (error) {
        showToast(getErrorMessage(error, "Uitnodiging opnieuw versturen mislukt."), "error");
      }
    });
  });

  container.querySelectorAll("[data-action='delete-user']").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const user = users.find((entry) => String(entry.id) === String(button.dataset.id));
        if (!user) return;
        if (String(user.id) === String(currentUser?.id || "")) {
          showToast("Je kan jezelf niet verwijderen.", "warning");
          return;
        }

        const confirmed = await confirmDeleteUser(user);
        if (!confirmed) return;

        await deleteUser(user.id);
        showToast("Gebruiker verwijderd.", "success");
        await renderUserTable(container, currentUser);
      } catch (error) {
        showToast(getErrorMessage(error, "Gebruiker verwijderen mislukt."), "error");
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
