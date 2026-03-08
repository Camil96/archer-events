import { supabase } from "./supabaseClient.js";

const AUTH_STORAGE_KEY = "archer_events_app_user_v1";
const DEFAULT_BRAND_ACCESS = ["academy", "invest", "fund"];
const authListeners = new Set();
const HARDCODED_TEST_ACCOUNTS = {
  "camilsahnoune@gmail.com": {
    id: "11111111-1111-1111-1111-111111111111",
    email: "camilsahnoune@gmail.com",
    password: "CamilvoorArcher2000!",
    role: "admin",
    brand_access: ["academy", "invest", "fund"],
  },
  "camil@archer.finance": {
    id: "22222222-2222-2222-2222-222222222222",
    email: "camil@archer.finance",
    password: "CamilvoorArcher2000!",
    role: "admin",
    brand_access: ["academy", "invest", "fund"],
  },
};

let currentUser = null;

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (["superadmin", "admin", "operations", "ops", "viewer", "finance", "mentor"].includes(role)) {
    return role === "ops" ? "operations" : role;
  }
  return "viewer";
}

function normalizeBrandAccess(value) {
  if (Array.isArray(value)) {
    const normalized = [...new Set(value.map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean))];
    return normalized.length ? normalized : [...DEFAULT_BRAND_ACCESS];
  }

  if (typeof value === "string") {
    const normalized = [...new Set(value.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean))];
    return normalized.length ? normalized : [...DEFAULT_BRAND_ACCESS];
  }

  return [...DEFAULT_BRAND_ACCESS];
}

function normalizeAppUserRow(row = {}) {
  const id = String(row.id || "").trim();
  if (!id) return null;

  return {
    id,
    email: String(row.email || "").trim().toLowerCase(),
    role: normalizeRole(row.role),
    brand_access: normalizeBrandAccess(row.brand_access),
  };
}

function persistCurrentUser() {
  if (typeof localStorage === "undefined") return;

  if (!currentUser) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
}

function readPersistedUser() {
  if (typeof localStorage === "undefined") return null;

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return normalizeAppUserRow(JSON.parse(raw));
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function emitAuthStateChange(event) {
  const session = currentUser ? { user: currentUser } : null;

  authListeners.forEach((listener) => {
    try {
      listener(event, session);
    } catch (error) {
      console.error("Auth listener fout:", error);
    }
  });
}

async function hashPasswordSha256(password) {
  if (!globalThis.crypto?.subtle) return null;

  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidPassword(password, storedHash) {
  const cleanStoredHash = String(storedHash || "").trim();
  if (!cleanStoredHash) return false;

  // Ondersteunt legacy plain-text records voor tijdelijke migratie.
  if (cleanStoredHash === password) return true;

  const hashed = await hashPasswordSha256(password);
  if (!hashed) return false;

  return hashed.toLowerCase() === cleanStoredHash.toLowerCase();
}

function getHardcodedTestAccount(email, password) {
  const key = String(email || "").trim().toLowerCase();
  const account = HARDCODED_TEST_ACCOUNTS[key];
  if (!account) return null;
  if (account.password !== String(password || "")) return null;

  return {
    id: account.id,
    email: account.email,
    password_hash: account.password,
    role: account.role,
    brand_access: account.brand_access,
  };
}

export function renderAuthLoading(container, message = "Authenticatie controleren...") {
  if (!container) return;

  container.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      background:#f4f4f4;
    ">
      <div style="
        width:100%;
        max-width:460px;
        background:#ffffff;
        border:1px solid #d6dde6;
        border-radius:18px;
        box-shadow:0 18px 46px rgba(0,0,0,0.12);
        padding:28px 26px;
        text-align:center;
      ">
        <img src="/archer-wordmark.png" alt="Archer" style="height:34px;width:auto;object-fit:contain;" onerror="this.style.display='none'">
        <p style="margin:16px 0 0;color:#2d3036;font-family:Inter,system-ui,-apple-system,sans-serif;font-weight:600;">${String(
          message || "Authenticatie controleren..."
        )}</p>
      </div>
    </div>
  `;
}

export function initializeAuthState() {
  currentUser = readPersistedUser();
  return currentUser;
}

export function getCurrentAppUser() {
  return currentUser;
}

export function isAuthenticated() {
  return !!currentUser?.id;
}

export function subscribeAuthState(onChange) {
  if (typeof onChange !== "function") return () => {};

  authListeners.add(onChange);
  return () => authListeners.delete(onChange);
}

export async function loginWithPassword(email, password) {
  const cleanEmailInput = String(email || "").trim();
  const cleanEmail = cleanEmailInput.toLowerCase();
  const cleanPassword = String(password || "");

  if (!cleanEmailInput) throw new Error("E-mailadres is verplicht.");
  if (!cleanPassword) throw new Error("Wachtwoord is verplicht.");

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .ilike("email", cleanEmailInput)
    .maybeSingle();

  if (import.meta.env.DEV) {
    const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
    console.log("[login-debug] ingevoerde email:", cleanEmailInput);
    console.log("[login-debug] app_users query rows:", rowCount);
  }

  const isNotFoundError = error?.code === "PGRST116";

  if (error && !isNotFoundError) {
    throw new Error("Inloggen mislukt door een databasefout.");
  }

  let userRow = data || null;

  if (!userRow) {
    userRow = getHardcodedTestAccount(cleanEmail, cleanPassword);
  }

  if (!userRow) {
    throw new Error("Geen account gevonden voor dit e-mailadres.");
  }

  const validPassword = await isValidPassword(cleanPassword, userRow.password_hash);
  if (!validPassword) {
    throw new Error("Onjuist wachtwoord.");
  }

  const nextUser = normalizeAppUserRow(userRow);
  if (!nextUser) {
    throw new Error("Gebruikersprofiel is ongeldig.");
  }

  currentUser = nextUser;
  persistCurrentUser();
  emitAuthStateChange("SIGNED_IN");

  return currentUser;
}

export function logoutAppUser() {
  currentUser = null;
  persistCurrentUser();
  emitAuthStateChange("SIGNED_OUT");
}

// Legacy markering: Supabase magic-link login is vervangen door in-app login.
export const LEGACY_SUPABASE_MAGIC_LINK_ENABLED = false;

export function getAuthRedirectUrl() {
  const envUrl = import.meta.env.VITE_APP_URL?.trim();
  const base = envUrl || window.location.origin;
  return `${base.replace(/\/+$/, "")}/`;
}

export async function getVerifiedSession() {
  return currentUser ? { user: currentUser } : null;
}

export async function sendMagicLink() {
  throw new Error("Magic-link login is uitgeschakeld. Gebruik e-mail en wachtwoord.");
}
