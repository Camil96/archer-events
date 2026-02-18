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
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <div class="card login-card" style="width:100%;max-width:400px;text-align:center;">
        <img src="/archer-logo.png" alt="Archer" style="height:48px;margin-bottom:24px;" />
        <h2 style="margin-bottom:24px;">Inloggen</h2>
        <input id="login-email" type="email" placeholder="jouw@email.be"
          style="width:100%;margin-bottom:12px;padding:10px;border:1px solid var(--border);border-radius:6px;font-size:1rem;" />
        <p id="login-error" style="color:var(--danger);font-size:.875rem;min-height:20px;margin-bottom:8px;"></p>
        <button id="login-btn" class="btn-primary" style="width:100%;justify-content:center;">Inloggen</button>
        <p id="login-success" style="display:none;margin-top:16px;color:var(--success,green);">
          ✉️ Controleer je inbox en klik op de link om in te loggen.
        </p>
      </div>
    </div>`;

  const btn = container.querySelector('#login-btn');
  const emailInput = container.querySelector('#login-email');
  const errorEl = container.querySelector('#login-error');
  const successEl = container.querySelector('#login-success');

  btn.onclick = async () => {
    const email = emailInput.value.trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Versturen...';
    errorEl.textContent = '';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://archer-events.vercel.app' },
    });

    if (error) {
      errorEl.textContent = error.message;
      btn.disabled = false;
      btn.textContent = 'Inloggen';
    } else {
      btn.style.display = 'none';
      emailInput.style.display = 'none';
      successEl.style.display = 'block';
    }
  };
}

