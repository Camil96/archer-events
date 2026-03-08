import { supabase } from "../supabaseClient.js";

function mapDatabaseError(error, fallback = "Gebruikersactie mislukt.") {
  if (!error) return new Error(fallback);
  const code = String(error.code || "");
  if (code === "23505") return new Error("Dit e-mailadres bestaat al.");
  if (code === "42703") {
    return new Error("De gebruikersdatabase mist vereiste kolommen. Voer eerst de SQL-migratie uit.");
  }
  return new Error(error.message || fallback);
}

function normalizeBrandAccess(value) {
  if (Array.isArray(value)) {
    const list = [...new Set(value.map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean))];
    return list.length ? list : ["academy", "invest", "fund"];
  }
  return ["academy", "invest", "fund"];
}

function normalizeRole(value) {
  const role = String(value || "viewer").trim().toLowerCase();
  if (["superadmin", "admin", "operations", "viewer"].includes(role)) return role;
  if (role === "ops") return "operations";
  return "viewer";
}

function normalizeStatus(value) {
  const status = String(value || "active").trim().toLowerCase();
  if (["invited", "active", "disabled"].includes(status)) return status;
  if (status === "actief") return "active";
  if (status === "inactief") return "disabled";
  return "active";
}

export async function listUsers(filters = {}) {
  let query = supabase.from("app_users").select("*").order("created_at", { ascending: false });

  const search = String(filters.search || "").trim();
  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  const role = String(filters.role || "").trim().toLowerCase();
  if (role) query = query.eq("role", role);

  const status = String(filters.status || "").trim().toLowerCase();
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw mapDatabaseError(error, "Gebruikers laden mislukt.");
  return data || [];
}

export async function getUserByEmail(email) {
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail) return null;

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .ilike("email", cleanEmail)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw mapDatabaseError(error, "Gebruiker ophalen mislukt.");
  }

  return data || null;
}

export async function getUserById(id) {
  const userId = String(id || "").trim();
  if (!userId) return null;

  const { data, error } = await supabase.from("app_users").select("*").eq("id", userId).maybeSingle();
  if (error && error.code !== "PGRST116") {
    throw mapDatabaseError(error, "Gebruiker ophalen mislukt.");
  }

  return data || null;
}

export async function getUserByInviteToken(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) return null;

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("invite_token", cleanToken)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw mapDatabaseError(error, "Nodiging ophalen mislukt.");
  }

  return data || null;
}

export async function createUser(payload = {}) {
  const row = {
    email: String(payload.email || "").trim().toLowerCase(),
    password_hash: String(payload.password_hash || "").trim(),
    first_name: String(payload.first_name || "").trim() || null,
    last_name: String(payload.last_name || "").trim() || null,
    role: normalizeRole(payload.role),
    brand_access: normalizeBrandAccess(payload.brand_access),
    status: normalizeStatus(payload.status || "active"),
    invite_token: payload.invite_token || null,
    invite_expires_at: payload.invite_expires_at || null,
    invited_by: payload.invited_by || null,
  };

  const { data, error } = await supabase.from("app_users").insert([row]).select().single();
  if (error) throw mapDatabaseError(error, "Gebruiker aanmaken mislukt.");
  return data;
}

export async function updateUser(id, fields = {}) {
  const payload = { ...fields };

  if (payload.email !== undefined) payload.email = String(payload.email || "").trim().toLowerCase();
  if (payload.role !== undefined) payload.role = normalizeRole(payload.role);
  if (payload.status !== undefined) payload.status = normalizeStatus(payload.status);
  if (payload.brand_access !== undefined) payload.brand_access = normalizeBrandAccess(payload.brand_access);

  const { data, error } = await supabase.from("app_users").update(payload).eq("id", id).select().single();
  if (error) throw mapDatabaseError(error, "Gebruiker bijwerken mislukt.");
  return data;
}

export async function toggleUserStatus(id, nextStatus = "disabled") {
  const status = normalizeStatus(nextStatus);
  return updateUser(id, { status });
}

export async function deleteUser(id) {
  const userId = String(id || "").trim();
  if (!userId) throw new Error("Gebruiker-ID ontbreekt.");

  const { error } = await supabase.from("app_users").delete().eq("id", userId);
  if (error) throw mapDatabaseError(error, "Gebruiker verwijderen mislukt.");
  return true;
}
