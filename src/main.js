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
  container.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:16px;
      background:#f4f4f4;
    ">
      <div class="card login-card" style="
        width:100%;
        max-width:420px;
        text-align:center;
        padding:32px 28px 20px;
        border-radius:16px;
        background:#2d3036;
        color:#ffffff;
        box-shadow:0 18px 45px rgba(0,0,0,0.35);
      ">
        <img src="/archer-logo.png" alt="Archer" style="height:40px;margin-bottom:20px;" />
        <h2 style="margin:0 0 8px;font-family:Inter,system-ui,-apple-system,sans-serif;font-weight:500;font-size:1.3rem;">
          Archer Events
        </h2>
        <p style="margin:0 0 24px;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:0.95rem;color:#a6b3c0;">
          Vul je e-mailadres in om toegang te krijgen tot Archer Events.
        </p>

        <input
          id="login-email"
          type="email"
          autocomplete="email"
          placeholder="jij@bedrijf.be"
          style="
            width:100%;
            margin-bottom:12px;
            padding:10px 12px;
            border-radius:8px;
            border:1px solid #444a55;
            background:#1b1d22;
            color:#ffffff;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            font-size:0.95rem;
            outline:none;
          "
        />

        <button
          id="login-btn"
          class="btn-primary"
          style="
            width:100%;
            justify-content:center;
            margin-top:4px;
            padding:10px 12px;
            border-radius:999px;
            border:none;
            background:#4d73ff;
            color:#ffffff;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            font-size:0.95rem;
            font-weight:500;
            cursor:pointer;
            transition:background 0.15s ease-out, transform 0.1s ease-out;
          "
        >
          Inloggen
        </button>

        <p id="login-success" style="
          display:none;
          margin-top:16px;
          font-family:Inter,system-ui,-apple-system,sans-serif;
          font-size:0.95rem;
          color:#a6b3c0;
        ">
          Check je mailbox.
        </p>

        <p style="
          margin-top:20px;
          font-family:Inter,system-ui,-apple-system,sans-serif;
          font-size:0.8rem;
          color:#a6b3c0;
        ">
          Vragen? Mail <a href="mailto:camilsahnoune@gmail.com" style="color:#85aeff;text-decoration:none;">camilsahnoune@gmail.com</a>
        </p>
      </div>
    </div>
  `;

  const btn = container.querySelector('#login-btn');
  const emailInput = container.querySelector('#login-email');
  const successEl = container.querySelector('#login-success');

  btn.onclick = async () => {
    const email = emailInput.value.trim();
    if (!email) {
      // Geen foutmeldingen tonen, gewoon niets doen als leeg.
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Bezig...';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://archer-events.vercel.app',
      },
    });

    // Ook bij error houden we de UI simpel: geen fouttekst.
    if (error) {
      btn.disabled = false;
      btn.textContent = 'Inloggen';
      return;
    }

    // Succes: verberg input + knop, toon "Check je mailbox."
    emailInput.style.display = 'none';
    btn.style.display = 'none';
    successEl.style.display = 'block';
  };
}


