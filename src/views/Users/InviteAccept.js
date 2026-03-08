import { setAuthenticatedUser } from "../../auth.js";
import { completeInvite, previewInviteByToken } from "../../api/invites.js";
import { showToast } from "../../utils.js";

function renderError(container, message) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f4f4;">
      <div class="card" style="max-width:560px;width:100%;padding:28px;border-radius:18px;">
        <h2 style="margin:0 0 10px;color:#8f1d2c;">Uitnodiging niet geldig</h2>
        <p style="margin:0;color:#2d3036;">${String(message || "Deze uitnodiging is ongeldig of verlopen.")}</p>
      </div>
    </div>
  `;
}

export async function renderInviteAcceptView(container, options = {}) {
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const token = String(params.get("token") || "").trim();

  if (!token) {
    renderError(container, "Geen uitnodigingstoken gevonden in de link.");
    return;
  }

  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f4f4;">
      <div class="card" style="max-width:560px;width:100%;padding:28px;border-radius:18px;">
        <p style="margin:0;color:#5f6c78;">Uitnodiging controleren...</p>
      </div>
    </div>
  `;

  let invitedUser;
  try {
    invitedUser = await previewInviteByToken(token);
  } catch (error) {
    renderError(container, error?.message || "Deze uitnodiging is ongeldig of verlopen.");
    return;
  }

  if (!invitedUser) {
    renderError(container, "Deze uitnodiging is ongeldig of al gebruikt.");
    return;
  }

  const displayName = [invitedUser.first_name, invitedUser.last_name].filter(Boolean).join(" ") || invitedUser.email;

  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f4f4;">
      <div class="card" style="max-width:620px;width:100%;padding:34px;border-radius:22px;">
        <p style="margin:0 0 8px;font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:#5f6c78;">Archer Events</p>
        <h1 style="margin:0 0 12px;font-size:1.55rem;color:#0f172a;">Welkom bij Archer Events</h1>
        <p style="margin:0 0 22px;color:#334155;">${displayName} – kies je wachtwoord om je account te activeren.</p>

        <form id="invite-accept-form" style="display:grid;gap:12px;">
          <input id="invite-password" type="password" autocomplete="new-password" placeholder="Nieuw wachtwoord" required style="padding:14px 14px;border-radius:12px;border:1px solid #cbd5e1;" />
          <input id="invite-password-confirm" type="password" autocomplete="new-password" placeholder="Herhaal wachtwoord" required style="padding:14px 14px;border-radius:12px;border:1px solid #cbd5e1;" />
          <p id="invite-error" style="margin:0;min-height:1.2em;color:#b91c1c;font-size:.92rem;"></p>
          <button id="invite-submit" type="submit" style="border:none;background:#4d73ff;color:#fff;padding:13px 16px;border-radius:999px;font-weight:600;cursor:pointer;">Account activeren</button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector("#invite-accept-form");
  const passwordEl = container.querySelector("#invite-password");
  const passwordConfirmEl = container.querySelector("#invite-password-confirm");
  const errorEl = container.querySelector("#invite-error");
  const submitEl = container.querySelector("#invite-submit");

  const setError = (message = "") => {
    if (errorEl) errorEl.textContent = String(message || "");
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = passwordEl?.value || "";
    const confirmPassword = passwordConfirmEl?.value || "";

    if (password.length < 10) {
      setError("Gebruik minstens 10 tekens voor je wachtwoord.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    submitEl.disabled = true;
    submitEl.textContent = "Bezig...";
    setError("");

    try {
      const activatedUser = await completeInvite({ token, password });
      setAuthenticatedUser(activatedUser);
      showToast("Account geactiveerd.", "success");

      if (typeof options.onComplete === "function") {
        options.onComplete(activatedUser);
        return;
      }

      window.history.replaceState({}, "", "/");
      window.location.reload();
    } catch (error) {
      setError(error?.message || "Account activeren mislukt.");
      submitEl.disabled = false;
      submitEl.textContent = "Account activeren";
    }
  });
}
