export function renderLoginView(container, options = {}) {
  if (!container) return;

  const onSubmit = typeof options.onSubmit === "function" ? options.onSubmit : null;
  const initialError = String(options.errorMessage || "").trim();
  const base = import.meta.env.BASE_URL || "/";
  const logoUrl = `${base}archer-wordmark.png`;
  const academyLogo = `${base}archer-wordmark.png`;
  const investLogo = `${base}brands/invest-logo.svg`;
  const fundLogo = `${base}brands/fund-logo.png`;

  container.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:32px;
      background:#f4f4f4;
    ">
      <div class="card login-card" style="
        width:100%;
        max-width:620px;
        padding:56px 42px 34px;
        border-radius:26px;
        background:#ffffff;
        color:#000000;
        border:1px solid rgba(45,48,54,0.10);
        box-shadow:0 26px 70px rgba(0,0,0,0.12);
      ">
        <div id="login-stack" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:22px;">
          <img
            id="login-logo"
            src="${logoUrl}"
            alt="Archer"
            style="width:min(100%, 420px);height:auto;max-width:100%;object-fit:contain;display:block;margin:0 auto;"
          />

          <p style="
            margin:0;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            letter-spacing:.16em;
            text-transform:uppercase;
            font-size:.95rem;
            color:#5f6c78;
          ">ARCHER EVENTS</p>

          <h1 style="
            margin:0;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            font-size:clamp(1.25rem,3.6vw,1.5rem);
            line-height:1.15;
            color:#000000;
            white-space:nowrap;
          ">Log in met je account</h1>

          <p style="
            margin:0;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            font-size:1rem;
            line-height:1.55;
            color:#2d3036;
          ">Gebruik je e-mailadres en wachtwoord.</p>

          <form id="login-form" style="width:100%;margin:0;display:flex;flex-direction:column;gap:14px;">
            <input
              id="login-email"
              type="email"
              autocomplete="email"
              placeholder="jij@bedrijf.be"
              required
              style="
                width:100%;
                padding:16px 16px;
                border-radius:14px;
                border:1px solid rgba(45,48,54,0.18);
                background:#ffffff;
                color:#000000;
                font-family:Inter,system-ui,-apple-system,sans-serif;
                font-size:1.02rem;
                outline:none;
              "
            />

            <input
              id="login-password"
              type="password"
              autocomplete="current-password"
              placeholder="Wachtwoord"
              required
              style="
                width:100%;
                padding:16px 16px;
                border-radius:14px;
                border:1px solid rgba(45,48,54,0.18);
                background:#ffffff;
                color:#000000;
                font-family:Inter,system-ui,-apple-system,sans-serif;
                font-size:1.02rem;
                outline:none;
              "
            />

            <p id="login-error" style="
              margin:0;
              color:#b91c1c;
              font-size:.92rem;
              line-height:1.4;
              text-align:left;
              min-height:1.2em;
            ">${initialError}</p>

            <button
              id="login-btn"
              type="submit"
              style="
                width:100%;
                padding:16px 16px;
                border-radius:999px;
                border:none;
                background:#4d73ff;
                color:#ffffff;
                font-family:Inter,system-ui,-apple-system,sans-serif;
                font-size:1.05rem;
                font-weight:500;
                cursor:pointer;
              "
            >
              Inloggen
            </button>
          </form>

          <div id="brand-logos" style="
            width:100%;
            margin-top:4px;
            display:grid;
            grid-template-columns:repeat(3, minmax(0, 1fr));
            gap:12px;
          ">
            <div style="height:58px;display:flex;align-items:center;justify-content:center;border:1px solid #d6dde6;border-radius:14px;background:#f8f9fc;padding:8px;">
              <img src="${academyLogo}" alt="Archer Academy" style="max-width:100%;max-height:26px;object-fit:contain;" />
            </div>
            <div style="height:58px;display:flex;align-items:center;justify-content:center;border:1px solid #d6dde6;border-radius:14px;background:#f8f9fc;padding:8px;">
              <img src="${investLogo}" alt="Archer Invest" style="max-width:100%;max-height:20px;object-fit:contain;" />
            </div>
            <div style="height:58px;display:flex;align-items:center;justify-content:center;border:1px solid #d6dde6;border-radius:14px;background:#f8f9fc;padding:8px;">
              <img src="${fundLogo}" alt="Archer Investment Fund" style="max-width:100%;max-height:28px;object-fit:contain;" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const logoEl = container.querySelector("#login-logo");
  if (logoEl) {
    logoEl.onerror = () => {
      logoEl.style.display = "none";
    };
  }

  const form = container.querySelector("#login-form");
  const emailInput = container.querySelector("#login-email");
  const passwordInput = container.querySelector("#login-password");
  const errorEl = container.querySelector("#login-error");
  const buttonEl = container.querySelector("#login-btn");

  const setPending = (pending) => {
    const isPending = Boolean(pending);
    buttonEl.disabled = isPending;
    buttonEl.textContent = isPending ? "Bezig..." : "Inloggen";
  };

  const setError = (message) => {
    if (!errorEl) return;
    errorEl.textContent = String(message || "");
  };

  emailInput?.focus();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput?.value?.trim()?.toLowerCase() || "";
    const password = passwordInput?.value || "";

    if (!email) {
      setError("E-mailadres is verplicht.");
      return;
    }

    if (!password) {
      setError("Wachtwoord is verplicht.");
      return;
    }

    setError("");
    setPending(true);

    if (!onSubmit) {
      setPending(false);
      setError("Login handler ontbreekt.");
      return;
    }

    try {
      await onSubmit({ email, password, setError, setPending });
    } catch (error) {
      setError(error?.message || "Inloggen mislukt.");
      setPending(false);
    }
  });
}
