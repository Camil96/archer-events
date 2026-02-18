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
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:var(--bg-muted);">
      <div class="card login-card" style="width:100%;max-width:400px;text-align:center;">
        <div style="margin-bottom:24px;">
           <img src="/logo-archer.png" alt="Archer Events" style="height:40px;">
        </div>
        <h2>Inloggen</h2>
        <p class="muted" style="margin-bottom:24px;">Log in om toegang te krijgen tot het operations dashboard.</p>
        <button id="login-btn" class="btn-primary" style="width:100%;justify-content:center;">Inloggen met Microsoft</button>
      </div>
    </div>
  `;
  container.querySelector("#login-btn").onclick = () => {
    supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: window.location.origin }
    });
  };
}
