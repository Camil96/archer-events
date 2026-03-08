import { renderAppShell } from "./appShell.js";
import {
  getCurrentAppUser,
  initializeAuthState,
  isAuthenticated,
  loginWithPassword,
  renderAuthLoading,
  subscribeAuthState,
} from "./auth.js";
import { renderLoginView } from "./views/Login.js";
import { setStoreAuthContext } from "./store.js";
import "./styles.css";

const root = document.getElementById("root");
let currentRender = "loading";
let unsubscribeAuthListener = null;

function applyStoreAuthContext(user) {
  setStoreAuthContext({
    userId: user?.id || null,
    role: user?.role || "viewer",
  });
}

function showFatalError(message) {
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f4f4;">
      <div style="max-width:640px;width:100%;background:#fff;border:1px solid #f0c7cd;border-radius:16px;padding:24px;font-family:Inter,system-ui,-apple-system,sans-serif;">
        <h2 style="margin:0 0 12px;color:#8f1d2c;">Authenticatie fout</h2>
        <p style="margin:0;color:#2d3036;">${String(message || "Onbekende fout.")}</p>
      </div>
    </div>
  `;
}

function renderLoginIfNeeded(errorMessage = "") {
  if (!root) return;

  applyStoreAuthContext(null);
  currentRender = "login";

  renderLoginView(root, {
    errorMessage,
    onSubmit: async ({ email, password, setError, setPending }) => {
      try {
        await loginWithPassword(email, password);
      } catch (error) {
        setPending(false);
        setError(error?.message || "Inloggen mislukt.");
      }
    },
  });
}

function renderAppIfNeeded() {
  if (!root) return;

  const user = getCurrentAppUser();
  if (!user?.id) {
    renderLoginIfNeeded();
    return;
  }

  applyStoreAuthContext(user);
  currentRender = "app";
  renderAppShell(root, { user });
}

function bootstrapAuth() {
  if (!root) return;

  renderAuthLoading(root, "Aan het laden...");
  initializeAuthState();

  if (!unsubscribeAuthListener) {
    unsubscribeAuthListener = subscribeAuthState((event, session) => {
      if (event === "SIGNED_OUT") {
        renderLoginIfNeeded();
        return;
      }

      if (session?.user) {
        renderAppIfNeeded();
      }
    });
  }

  if (isAuthenticated()) {
    renderAppIfNeeded();
    return;
  }

  renderLoginIfNeeded();
}

try {
  bootstrapAuth();
} catch (error) {
  showFatalError(error?.message || "Kon authenticatie niet initialiseren.");
}

// Legacy markering: magic-link / Supabase Auth loginflow is vervangen door in-app login.
if (currentRender === "loading") {
  renderLoginIfNeeded();
}
