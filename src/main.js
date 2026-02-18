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
      padding:18px;
      background:#f4f4f4;
    ">
      <div class="card login-card" style="
        width:100%;
        max-width:440px;
        text-align:center;
        padding:34px 28px 22px;
        border-radius:18px;
        background:#ffffff;
        color:#000000;
        border:1px solid rgba(45,48,54,0.10);
        box-shadow:0 18px 45px rgba(0,0,0,0.12);
      ">
        <img
          id="login-logo"
          src="${logoUrl}"
          alt="Archer"
          style="
            height:64px;
            max-width:85%;
            object-fit:contain;
            margin:0 auto 18px;
            display:block;
          "
        />

        <p style="
          margin:0 0 22px;
          font-family:Inter,system-ui,-apple-system,sans-serif;
          font-size:1rem;
          color:#2d3036;
        ">
          Vul je e-mailadres in om toegang te krijgen.
        </p>

        <form id="login-form" style="margin:0;">
          <input
            id="login-email"
            type="email"
            autocomplete="email"
            placeholder="jij@bedrijf.be"
            required
            style="
              width:100%;
              margin-bottom:12px;
              padding:12px 12px;
              border-radius:10px;
              border:1px solid rgba(45,48,54,0.18);
              background:#ffffff;
              color:#000000;
              font-family:Inter,system-ui,-apple-system,sans-serif;
              font-size:1rem;
              outline:none;
            "
          />

          <button
            id="login-btn"
            type="submit"
            style="
              width:100%;
              padding:12px 12px;
              border-radius:999px;
              border:none;
              background:#4d73ff;
              color:#ffffff;
              font-family:Inter,system-ui,-apple-system,sans-serif;
              font-size:1rem;
              font-weight:500;
              cursor:pointer;
            "
          >
            Inloggen
          </button>
        </form>

        <p id="login-success" style="
          display:none;
          margin-top:16px;
          font-family:Inter,system-ui,-apple-system,sans-serif;
          font-size:1rem;
          color:#2d3036;
        ">
          Check je mailbox.
        </p>

        <p style="
          margin-top:18px;
          font-family:Inter,system-ui,-apple-system,sans-serif;
          font-size:0.85rem;
          color:rgba(45,48,54,0.75);
        ">
          Vragen? Mail <a href="mailto:camilsahnoune@gmail.com" style="color:#4d73ff;text-decoration:none;">camilsahnoune@gmail.com</a>
        </p>
      </div>
    </div>
  `;

  // Als het logo-pad fout is, verberg broken image.
  const logoEl = container.querySelector('#login-logo');
  logoEl.onerror = () => { logoEl.style.display = 'none'; };

  const form = container.querySelector('#login-form');
  const btn = container.querySelector('#login-btn');
  const emailInput = container.querySelector('#login-email');
  const successEl = container.querySelector('#login-success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Enter werkt nu automatisch.

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

    form.style.display = 'none';
    successEl.style.display = 'block';
  });
}





