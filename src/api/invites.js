import { buildInviteEmail } from "../utils/emailTemplates.js";
import { hashPasswordSha256 } from "../utils/passwordHash.js";
import { supabase } from "../supabaseClient.js";
import { createUser, getUserByEmail, getUserById, getUserByInviteToken, updateUser } from "./users.js";

const INVITE_VALID_DAYS = 7;

function getAppBaseUrl(explicitBaseUrl) {
  const configured = String(explicitBaseUrl || import.meta.env.VITE_APP_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return window.location.origin.replace(/\/+$/, "");
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function createInviteToken(byteLength = 24) {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function normalizeRole(value) {
  const role = String(value || "viewer").trim().toLowerCase();
  if (["superadmin", "admin", "operations", "viewer"].includes(role)) return role;
  if (role === "ops") return "operations";
  return "viewer";
}

function normalizeBrandAccess(value) {
  if (Array.isArray(value)) {
    const list = [...new Set(value.map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean))];
    return list.length ? list : ["academy", "invest", "fund"];
  }
  return ["academy", "invest", "fund"];
}

function ensureInviteNotExpired(user) {
  const expiryRaw = user?.invite_expires_at;
  if (!expiryRaw) throw new Error("Deze uitnodiging is ongeldig of al gebruikt.");

  const expiresAt = new Date(expiryRaw);
  if (!Number.isFinite(expiresAt.getTime())) {
    throw new Error("Deze uitnodiging is ongeldig.");
  }

  if (expiresAt.getTime() < Date.now()) {
    throw new Error("Deze uitnodiging is verlopen. Vraag een nieuwe uitnodiging aan.");
  }
}

function buildInviteLink(appBaseUrl, inviteToken) {
  const base = String(appBaseUrl || "").replace(/\/+$/, "");
  const token = encodeURIComponent(String(inviteToken || "").trim());
  return `${base}/invite?token=${token}`;
}

export async function sendInviteEmail({ toEmail, firstName, inviteLink, appName = "Archer Events" } = {}) {
  const cleanEmail = String(toEmail || "").trim().toLowerCase();
  const cleanInviteLink = String(inviteLink || "").trim();
  if (!cleanEmail || !cleanInviteLink) {
    throw new Error("Invite-mail mist ontvanger of link.");
  }

  const emailPayload = buildInviteEmail({
    appName,
    inviteLink: cleanInviteLink,
    firstName,
  });

  try {
    const functionName = String(import.meta.env.VITE_INVITE_EMAIL_FUNCTION || "send-invite-email").trim();
    const { error } = await supabase.functions.invoke(functionName, {
      body: {
        toEmail: cleanEmail,
        subject: emailPayload.subject,
        text: emailPayload.text,
        html: emailPayload.html,
      },
    });

    if (error) throw error;
    return { delivered: true, mode: "edge_function" };
  } catch (error) {
    // TODO: production mail delivery via Supabase Edge Function
    // `send-invite-email` koppelen aan provider (bijv. Resend/SMTP) en secret keys server-side bewaren.
    if (import.meta.env.DEV) {
      console.warn("[invite-mail-dev] mailservice niet beschikbaar, gebruik fallback link:", cleanInviteLink, error);
      return { delivered: false, mode: "dev_fallback", errorMessage: error?.message || "Mailservice niet beschikbaar." };
    }
    return { delivered: false, mode: "fallback", errorMessage: error?.message || "Mailservice niet beschikbaar." };
  }
}

export async function createUserInvite({
  email,
  role = "viewer",
  brandAccess = ["academy", "invest", "fund"],
  firstName = "",
  lastName = "",
  invitedBy = null,
  appBaseUrl,
} = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) throw new Error("E-mailadres is verplicht.");

  const inviteToken = createInviteToken();
  const inviteExpiresAt = addDays(new Date(), INVITE_VALID_DAYS).toISOString();

  const existingUser = await getUserByEmail(cleanEmail);

  let user;
  if (existingUser?.id) {
    if (existingUser.status === "active") {
      throw new Error("Er bestaat al een actief account voor dit e-mailadres.");
    }

    user = await updateUser(existingUser.id, {
      email: cleanEmail,
      first_name: String(firstName || existingUser.first_name || "").trim() || null,
      last_name: String(lastName || existingUser.last_name || "").trim() || null,
      role: normalizeRole(role || existingUser.role),
      brand_access: normalizeBrandAccess(brandAccess || existingUser.brand_access),
      status: "invited",
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt,
      invited_by: invitedBy || existingUser.invited_by || null,
    });
  } else {
    user = await createUser({
      email: cleanEmail,
      password_hash: "",
      first_name: String(firstName || "").trim() || null,
      last_name: String(lastName || "").trim() || null,
      role: normalizeRole(role),
      brand_access: normalizeBrandAccess(brandAccess),
      status: "invited",
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt,
      invited_by: invitedBy || null,
    });
  }

  const appUrl = getAppBaseUrl(appBaseUrl);
  const inviteLink = buildInviteLink(appUrl, inviteToken);
  const emailTemplate = buildInviteEmail({
    appName: "Archer Events",
    inviteLink,
    firstName: user.first_name || firstName,
  });
  const emailDelivery = await sendInviteEmail({
    toEmail: cleanEmail,
    firstName: user.first_name || firstName,
    inviteLink,
    appName: "Archer Events",
  });

  if (import.meta.env.DEV) {
    console.log("[invite-dev] link:", inviteLink);
  }

  return {
    user,
    inviteToken,
    inviteExpiresAt,
    inviteLink,
    emailTemplate,
    emailDelivery,
  };
}

export async function resendUserInvite(userId, { invitedBy = null, appBaseUrl } = {}) {
  const user = await getUserById(userId);
  if (!user?.id) throw new Error("Gebruiker niet gevonden.");

  return createUserInvite({
    email: user.email,
    role: user.role,
    brandAccess: user.brand_access,
    firstName: user.first_name,
    lastName: user.last_name,
    invitedBy: invitedBy || user.invited_by,
    appBaseUrl,
  });
}

export async function completeInvite({ token, password }) {
  const inviteToken = String(token || "").trim();
  const plainPassword = String(password || "");

  if (!inviteToken) throw new Error("Nodigingstoken ontbreekt.");
  if (!plainPassword || plainPassword.length < 10) {
    throw new Error("Kies een wachtwoord van minstens 10 tekens.");
  }

  const user = await getUserByInviteToken(inviteToken);
  if (!user) {
    throw new Error("Deze uitnodiging is ongeldig of al gebruikt.");
  }

  ensureInviteNotExpired(user);

  const passwordHash = await hashPasswordSha256(plainPassword);

  const updated = await updateUser(user.id, {
    password_hash: passwordHash,
    status: "active",
    invite_token: null,
    invite_expires_at: null,
  });

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    brand_access: updated.brand_access,
    first_name: updated.first_name,
    last_name: updated.last_name,
    status: updated.status,
  };
}

export async function previewInviteByToken(token) {
  const user = await getUserByInviteToken(token);
  if (!user) return null;

  ensureInviteNotExpired(user);
  return user;
}
