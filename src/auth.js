import { getUserByEmail } from "./api/users.js";
import { verifyPasswordWithHash } from "./utils/passwordHash.js";

const AUTH_STORAGE_KEY = "archer_events_app_user_v1";
const DEFAULT_BRAND_ACCESS = ["academy", "invest", "fund"];
const authListeners = new Set();

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

function normalizeStatus(value) {
  const status = String(value || "active").trim().toLowerCase();
  if (["invited", "active", "disabled"].includes(status)) return status;
  if (status === "actief") return "active";
  if (status === "inactief") return "disabled";
  return "active";
}

function normalizeAppUserRow(row = {}) {
  const id = String(row.id || "").trim();
  if (!id) return null;

  return {
    id,
    email: String(row.email || "").trim().toLowerCase(),
    role: normalizeRole(row.role),
    brand_access: normalizeBrandAccess(row.brand_access),
    first_name: String(row.first_name || "").trim(),
    last_name: String(row.last_name || "").trim(),
    status: normalizeStatus(row.status),
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

export function setAuthenticatedUser(user) {
  const normalized = normalizeAppUserRow(user);
  if (!normalized) throw new Error("Gebruikerssessie kan niet worden ingesteld.");

  currentUser = normalized;
  persistCurrentUser();
  emitAuthStateChange("SIGNED_IN");
  return currentUser;
}

export function isAuthenticated() {
  return !!currentUser?.id;
}

export function hasRole(roles, user = currentUser) {
  if (!user?.id) return false;
  const allowed = Array.isArray(roles) ? roles : [roles];
  const normalized = allowed.map((role) => normalizeRole(role));
  return normalized.includes(normalizeRole(user.role));
}

export function hasBrandAccess(brandKey, user = currentUser) {
  if (!user?.id) return false;
  const brand = String(brandKey || "").trim().toLowerCase();
  if (!brand) return true;
  return normalizeBrandAccess(user.brand_access).includes(brand);
}

export function subscribeAuthState(onChange) {
  if (typeof onChange !== "function") return () => {};

  authListeners.add(onChange);
  return () => authListeners.delete(onChange);
}

export async function loginWithPassword(email, password) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");

  if (!cleanEmail) throw new Error("E-mailadres is verplicht.");
  if (!cleanPassword) throw new Error("Wachtwoord is verplicht.");

  const user = await getUserByEmail(cleanEmail);
  if (!user) {
    throw new Error("Geen account gevonden voor dit e-mailadres.");
  }

  const status = normalizeStatus(user.status);
  if (status === "invited") {
    throw new Error("Je account is nog niet geactiveerd. Gebruik de link uit je uitnodigingsmail.");
  }
  if (status === "disabled") {
    throw new Error("Je account is gedeactiveerd. Neem contact op met een beheerder.");
  }

  const validPassword = await verifyPasswordWithHash(cleanPassword, user.password_hash);
  if (!validPassword) {
    throw new Error("Onjuist wachtwoord.");
  }

  return setAuthenticatedUser(user);
}

export function logoutAppUser() {
  currentUser = null;
  persistCurrentUser();
  emitAuthStateChange("SIGNED_OUT");
}

export const LEGACY_SUPABASE_MAGIC_LINK_ENABLED = false;

// Legacy helpers voor compatibiliteit met oudere imports.
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
