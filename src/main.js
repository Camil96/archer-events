import { supabase } from "./supabaseClient.js";
import { renderAppShell } from "./appShell.js";
import "./styles.css";

const root = document.getElementById("root");

function getAuthRedirectUrl() {
  const envUrl = import.meta.env.VITE_APP_URL?.trim();
  const base = envUrl || window.location.origin;
  return base.replace(/\/+$/, "") + "/";
}

/* robust auth initialization */
async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      renderAppShell(root, session);
    } else {
      renderLogin(root);
    }

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') renderAppShell(root, session);
      if (event === 'SIGNED_OUT') renderLogin(root);
    });
  } catch (err) {
    root.innerHTML = `<div style="padding:20px;color:red">Application Error: ${err.message}</div>`;
  }
}

init();

function renderLogin(container) {
  const base = import.meta.env.BASE_URL || '/';
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
        padding:58px 42px 34px;
        border-radius:26px;
        background:#ffffff;
        color:#000000;
        border:1px solid rgba(45,48,54,0.10);
        box-shadow:0 26px 70px rgba(0,0,0,0.12);
      ">
        <div id="login-stack" style="
          display:flex;
          flex-direction:column;
          align-items:center;
          text-align:center;
          gap:26px;
        ">
          <img
            id="login-logo"
            src="${logoUrl}"
            alt="Archer"
            style="
              width:min(100%, 420px);
              height:auto;
              max-width:100%;
              object-fit:contain;
              display:block;
              margin:0 auto;
            "
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
            font-size:clamp(2rem,4.8vw,3rem);
            line-height:1.05;
            color:#000000;
          ">Log in met je e-mailadres</h1>

          <p id="login-headline" style="
            margin:0;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            font-size:1.1rem;
            line-height:1.55;
            color:#2d3036;
          ">We sturen je een beveiligde link.</p>

          <form id="login-form" style="
            width:100%;
            margin:0;
            display:flex;
            flex-direction:column;
            gap:18px;
          ">
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
                font-size:1.05rem;
                outline:none;
              "
            />

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
              Stuur link
            </button>
          </form>

          <div id="brand-logos" style="
            width:100%;
            margin-top:4px;
            display:grid;
            grid-template-columns:repeat(3, minmax(0, 1fr));
            gap:12px;
          ">
            <a href="https://archer.academy/" target="_blank" rel="noopener noreferrer" aria-label="Archer Academy" style="height:58px;display:flex;align-items:center;justify-content:center;border:1px solid #d6dde6;border-radius:14px;background:#f8f9fc;padding:8px;text-decoration:none;">
              <img src="${academyLogo}" alt="Archer Academy" style="max-width:100%;max-height:26px;object-fit:contain;" />
            </a>
            <a href="https://archerinvest.be/" target="_blank" rel="noopener noreferrer" aria-label="Archer Invest" style="height:58px;display:flex;align-items:center;justify-content:center;border:1px solid #d6dde6;border-radius:14px;background:#f8f9fc;padding:8px;text-decoration:none;">
              <img src="${investLogo}" alt="Archer Invest" style="max-width:100%;max-height:20px;object-fit:contain;" />
            </a>
            <a href="https://archerinvestment.fund/" target="_blank" rel="noopener noreferrer" aria-label="Archer Investment Fund" style="height:58px;display:flex;align-items:center;justify-content:center;border:1px solid #d6dde6;border-radius:14px;background:#f8f9fc;padding:8px;text-decoration:none;">
              <img src="${fundLogo}" alt="Archer Investment Fund" style="max-width:100%;max-height:28px;object-fit:contain;" />
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  const logoEl = container.querySelector('#login-logo');
  logoEl.onerror = () => { logoEl.style.display = 'none'; };

  const headlineEl = container.querySelector('#login-headline');
  const form = container.querySelector('#login-form');
  const brandLogos = container.querySelector('#brand-logos');
  const btn = container.querySelector('#login-btn');
  const emailInput = container.querySelector('#login-email');

  emailInput.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Bezig...';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });

    if (error) {
      btn.disabled = false;
      btn.textContent = 'Stuur link';
      headlineEl.textContent = error.message || 'Er ging iets mis. Probeer opnieuw.';
      return;
    }

    // Resultaat na submit: alleen logo + statusmelding.
    headlineEl.textContent = 'Link verzonden. Check je mailbox.';
    form.style.display = 'none';
    brandLogos.style.display = 'none';
  });
}
