import { supabase } from "./supabaseClient.js";
import { renderAppShell } from "./appShell.js";
import "./styles.css";

const root = document.getElementById("root");

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
    console.error("Init error:", err);
    root.innerHTML = `<div style="padding:20px;color:red">Application Error: ${err.message}</div>`;
  }
}

init();

function renderLogin(container) {
  const base = import.meta.env.BASE_URL || '/';
  const logoUrl = `${base}archer-logo.png`;

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
        max-width:560px;
        padding:58px 42px 34px;
        border-radius:26px;
        background:#ffffff;
        color:#000000;
        border:1px solid rgba(45,48,54,0.10);
        box-shadow:0 26px 70px rgba(0,0,0,0.12);
      ">
        <div style="
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
              height:clamp(240px, 30vw, 420px);
              width:auto;
              max-width:100%;
              object-fit:contain;
              display:block;
              margin:0 auto;
            "
          />

          <!-- Dit blok wordt na submit vervangen door 'Check je mailbox.' -->
          <p id="login-headline" style="
            margin:0;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            font-size:1.1rem;
            line-height:1.55;
            color:#2d3036;
          ">Vul je e-mailadres in om toegang te krijgen.</p>

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
              Inloggen
            </button>
          </form>

          <p style="
            margin:6px 0 0;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            font-size:0.95rem;
            color:rgba(45,48,54,0.75);
          ">
            Vragen? Mail <a href="mailto:camilsahnoune@gmail.com" style="color:#4d73ff;text-decoration:none;">camilsahnoune@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  `;

  const logoEl = container.querySelector('#login-logo');
  logoEl.onerror = () => { logoEl.style.display = 'none'; };

  const headlineEl = container.querySelector('#login-headline');
  const form = container.querySelector('#login-form');
  const btn = container.querySelector('#login-btn');
  const emailInput = container.querySelector('#login-email');

  emailInput.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Enter werkt

    const email = emailInput.value.trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Bezig...';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      btn.disabled = false;
      btn.textContent = 'Inloggen';
      return;
    }

    // Na succesvolle submit: alleen "Check je mailbox." onder het logo.
    headlineEl.textContent = 'Check je mailbox.';
    form.style.display = 'none';
  });
}
