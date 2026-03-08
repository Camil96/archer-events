import { supabase } from "./supabaseClient.js";
import { getBrandAliases, getBrandDbValue, resolveBrandKey } from "./config.js";
import { EVENT_CATALOG_2026 } from "./data/eventCatalog2026.js";

export const store = {
  brandId: "academy",
};

const authContext = {
  userId: null,
  role: "viewer",
};

export function setStoreAuthContext(context = {}) {
  authContext.userId = context.userId ? String(context.userId) : null;
  authContext.role = String(context.role || "viewer").trim().toLowerCase() || "viewer";
}

function shouldScopeByOwner() {
  return !!authContext.userId && authContext.role !== "admin";
}

function addOwnerContext(payload = {}) {
  const row = { ...payload };
  if (shouldScopeByOwner() && !row.owner_id) {
    row.owner_id = authContext.userId;
  }
  return row;
}

function removeOwnerContext(payload = {}) {
  const row = { ...payload };
  delete row.owner_id;
  return row;
}

function errorHasColumn(error, columnName) {
  const haystack = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return haystack.includes("column") && haystack.includes(String(columnName || "").toLowerCase());
}

async function insertSingleRow(table, payload) {
  const row = addOwnerContext(payload);
  let { data, error } = await supabase.from(table).insert([row]).select().single();

  if (error && row.owner_id && errorHasColumn(error, "owner_id")) {
    ({ data, error } = await supabase.from(table).insert([removeOwnerContext(row)]).select().single());
  }

  if (error) throw error;
  return data;
}

function normalizePeriodFilter(period) {
  const value = String(period || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "this_month" || value === "month") return "month";
  if (value === "this_quarter" || value === "quarter") return "quarter";
  if (value === "this_year" || value === "year") return "year";
  return "";
}

function getStatusFilterValues(rawStatus) {
  const value = String(rawStatus || "").trim().toLowerCase();
  if (!value) return [];
  if (value === "bevestigd" || value === "confirmed") return ["bevestigd", "confirmed"];
  if (value === "afgerond" || value === "completed" || value === "done") return ["afgerond", "completed", "done"];
  if (value === "geannuleerd" || value === "cancelled") return ["geannuleerd", "cancelled"];
  if (value === "gepland" || value === "planned") return ["gepland", "planned"];
  return [value];
}

function getPeriodBounds(periodKey) {
  const now = new Date();

  if (periodKey === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  if (periodKey === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    return {
      start: new Date(now.getFullYear(), quarter * 3, 1),
      end: new Date(now.getFullYear(), (quarter + 1) * 3, 1),
    };
  }

  if (periodKey === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
    };
  }

  return null;
}

function getBrandFilterValues(rawBrand) {
  const input = String(rawBrand || "").trim();
  if (!input || input === "Alles") return [];

  const canonical = resolveBrandKey(input);
  const aliases = getBrandAliases(canonical) || [];
  return [...new Set(aliases.map((alias) => String(alias || "").trim()).filter(Boolean))];
}

function toMinuteStamp(dateValue) {
  const stamp = new Date(dateValue || "").getTime();
  return Number.isFinite(stamp) ? Math.floor(stamp / 60000) : NaN;
}

function normalizeBrandLabel(rawBrand) {
  return getBrandDbValue(rawBrand || "Invest");
}

function toEventDateValue(dateInput) {
  const value = String(dateInput || "").trim();
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function sanitizeCatalogEventRow(event) {
  const startAt = String(event?.start_at || event?.event_date || "").trim();
  if (!startAt) return null;

  const startStamp = new Date(startAt).getTime();
  if (!Number.isFinite(startStamp)) return null;

  const endRaw = String(event?.end_at || "").trim();
  const endStamp = endRaw ? new Date(endRaw).getTime() : NaN;
  const endAt = Number.isFinite(endStamp) ? endRaw : null;

  const eventDate = toEventDateValue(startAt);
  if (!eventDate) return null;

  return {
    title: event.title,
    brand: normalizeBrandLabel(event.brand),
    start_at: startAt,
    event_date: eventDate,
    end_at: endAt,
    location: event.location || null,
    timezone: "Europe/Brussels",
    capacity: 0,
    description: event.description || null,
  };
}

function toCatalogKey(brand, title, startAt) {
  const cleanBrand = normalizeBrandLabel(brand).toLowerCase();
  const cleanTitle = String(title || "").trim().toLowerCase();
  const minuteStamp = toMinuteStamp(startAt);
  if (!Number.isFinite(minuteStamp)) return `${cleanBrand}|${cleanTitle}|${String(startAt || "")}`;
  return `${cleanBrand}|${cleanTitle}|${minuteStamp}`;
}

async function applyCatalogCorrections(existingRows) {
  const investorIntroMinutes = new Set(
    EVENT_CATALOG_2026.filter((event) => event.title === "Investor Introduction")
      .map((event) => toMinuteStamp(event.start_at))
      .filter(Number.isFinite)
  );

  const masterclassMinutes = new Set(
    EVENT_CATALOG_2026.filter((event) => event.title === "Masterclass")
      .map((event) => toMinuteStamp(event.start_at))
      .filter(Number.isFinite)
  );

  let corrected = 0;

  for (const row of existingRows || []) {
    const stamp = toMinuteStamp(row.start_at || row.event_date);
    if (!Number.isFinite(stamp)) continue;

    const title = String(row.title || "").trim().toLowerCase();
    const brand = normalizeBrandLabel(row.brand);
    const changes = {};

    if (title === "investor introduction" && investorIntroMinutes.has(stamp) && brand !== "Fund") {
      changes.brand = "Fund";
    }

    if (masterclassMinutes.has(stamp)) {
      if (title === "archer invest: de vierdaagse") changes.title = "Masterclass";
      if (brand !== "Invest") changes.brand = "Invest";
    }

    if (!Object.keys(changes).length) continue;

    let updateQuery = supabase.from("events").update(changes).eq("id", row.id);
    if (shouldScopeByOwner()) updateQuery = updateQuery.eq("owner_id", authContext.userId);

    let { error } = await updateQuery;
    if (error && shouldScopeByOwner() && errorHasColumn(error, "owner_id")) {
      ({ error } = await supabase.from("events").update(changes).eq("id", row.id));
    }

    if (error) throw error;
    corrected += 1;
  }

  return corrected;
}

function buildEventsQuery(filters = {}, includeOwnerScope = true) {
  let query = supabase
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .order("start_at", { ascending: true });

  if (includeOwnerScope && shouldScopeByOwner()) {
    query = query.eq("owner_id", authContext.userId);
  }

  const brandFilterValues = getBrandFilterValues(filters.brand);
  if (brandFilterValues.length === 1) {
    query = query.eq("brand", brandFilterValues[0]);
  } else if (brandFilterValues.length > 1) {
    query = query.in("brand", brandFilterValues);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
  }

  const statusFilterValues = getStatusFilterValues(filters.status);
  if (statusFilterValues.length === 1) {
    query = query.eq("status", statusFilterValues[0]);
  } else if (statusFilterValues.length > 1) {
    query = query.in("status", statusFilterValues);
  }

  const normalizedPeriod = normalizePeriodFilter(filters.period);
  const bounds = getPeriodBounds(normalizedPeriod);
  if (bounds) {
    query = query.gte("start_at", bounds.start.toISOString()).lt("start_at", bounds.end.toISOString());
  }

  if (filters.dateFrom) {
    const parsedFrom = new Date(filters.dateFrom);
    if (Number.isFinite(parsedFrom.getTime())) {
      query = query.gte("start_at", parsedFrom.toISOString());
    }
  }
  if (filters.dateTo) {
    const parsedTo = new Date(filters.dateTo);
    if (Number.isFinite(parsedTo.getTime())) {
      query = query.lte("start_at", parsedTo.toISOString());
    }
  }

  return query;
}

/* ─── EVENTS ─── */
export async function listEvents(filters = {}) {
  let { data, error } = await buildEventsQuery(filters, true);
  if (error && shouldScopeByOwner() && errorHasColumn(error, "owner_id")) {
    ({ data, error } = await buildEventsQuery(filters, false));
  }
  if (error) throw error;
  return (data || []).map((event) => ({ ...event, start_at: event.start_at || event.event_date }));
}

export async function importEventCatalog2026() {
  const rows = EVENT_CATALOG_2026.map(sanitizeCatalogEventRow).filter(Boolean);
  const invalidRows = EVENT_CATALOG_2026.length - rows.length;

  if (!rows.length) {
    return { inserted: 0, skipped: 0, corrected: 0, invalid: invalidRows };
  }

  let existingQuery = supabase
    .from("events")
    .select("id,title,start_at,event_date,brand");
  if (shouldScopeByOwner()) existingQuery = existingQuery.eq("owner_id", authContext.userId);
  let { data: existing, error: fetchError } = await existingQuery;
  if (fetchError && shouldScopeByOwner() && errorHasColumn(fetchError, "owner_id")) {
    ({ data: existing, error: fetchError } = await supabase
      .from("events")
      .select("id,title,start_at,event_date,brand"));
  }

  if (fetchError) throw fetchError;

  const corrected = await applyCatalogCorrections(existing || []);

  let refreshQuery = supabase
    .from("events")
    .select("title,start_at,event_date,brand");
  if (shouldScopeByOwner()) refreshQuery = refreshQuery.eq("owner_id", authContext.userId);
  let { data: refreshed, error: refreshError } = await refreshQuery;
  if (refreshError && shouldScopeByOwner() && errorHasColumn(refreshError, "owner_id")) {
    ({ data: refreshed, error: refreshError } = await supabase
      .from("events")
      .select("title,start_at,event_date,brand"));
  }

  if (refreshError) throw refreshError;

  const existingKeys = new Set(
    (refreshed || []).map((row) => toCatalogKey(row.brand, row.title, row.start_at || row.event_date))
  );
  const missingRows = rows.filter((row) => !existingKeys.has(toCatalogKey(row.brand, row.title, row.start_at)));

  if (!missingRows.length) {
    return { inserted: 0, skipped: rows.length + invalidRows, corrected, invalid: invalidRows };
  }

  const rowsWithOwner = missingRows.map((row) => addOwnerContext(row));
  let { error: insertError } = await supabase.from("events").insert(rowsWithOwner);
  if (insertError && rowsWithOwner.some((row) => row.owner_id) && errorHasColumn(insertError, "owner_id")) {
    ({ error: insertError } = await supabase.from("events").insert(missingRows));
  }
  if (insertError) throw insertError;

  return {
    inserted: missingRows.length,
    skipped: rows.length - missingRows.length + invalidRows,
    corrected,
    invalid: invalidRows,
  };
}

export async function createEvent(payload) {
  if (!payload.timezone) payload.timezone = 'Europe/Brussels';
  if (payload.start_at) payload.event_date = toEventDateValue(payload.start_at);
  if (!payload.event_date && payload.start_at) payload.event_date = payload.start_at;

  const row = addOwnerContext(payload);
  let { data, error } = await supabase.from('events').insert([row]).select().single();
  if (error && row.owner_id && errorHasColumn(error, "owner_id")) {
    ({ data, error } = await supabase.from("events").insert([removeOwnerContext(row)]).select().single());
  }
  if (error) throw error;
  return data;
}

export async function updateEvent(id, payload) {
  if (payload.start_at) payload.event_date = toEventDateValue(payload.start_at) || payload.start_at;
  let query = supabase.from('events').update(payload).eq('id', id);
  if (shouldScopeByOwner()) query = query.eq("owner_id", authContext.userId);
  let { data, error } = await query.select().single();
  if (error && shouldScopeByOwner() && errorHasColumn(error, "owner_id")) {
    ({ data, error } = await supabase.from("events").update(payload).eq("id", id).select().single());
  }
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  let query = supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (shouldScopeByOwner()) query = query.eq("owner_id", authContext.userId);
  let { error } = await query;
  if (error && shouldScopeByOwner() && errorHasColumn(error, "owner_id")) {
    ({ error } = await supabase.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", id));
  }
  if (error) throw error;
}

/* ─── TASKS ─── */
export async function listTasks(eventId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*), task_assignments(user_id)')
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('due_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTask(payload) {
  return insertSingleRow("tasks", payload);
}

export async function updateTask(id, payload) {
  const { data, error } = await supabase.from('tasks').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

/* ─── TASK ASSIGNMENTS ─── */
export async function assignTask(taskId, userId) {
  // We first clear existing (if we want single assignment for this app) or just add
  // User asked for "toewijzen aan een gebruiker", let's replace existing
  await supabase.from('task_assignments').delete().eq('task_id', taskId);
  const { data, error } = await supabase.from('task_assignments').insert([{ task_id: taskId, user_id: userId }]).select().single();
  if (error) throw error;

  // Also update the main task table for easier joins if needed
  await supabase.from('tasks').update({ assignee_user_id: userId }).eq('id', taskId);
  return data;
}

export async function unassignTask(taskId) {
  await supabase.from('task_assignments').delete().eq('task_id', taskId);
  await supabase.from('tasks').update({ assignee_user_id: null }).eq('id', taskId);
}

/* ─── SUBTASKS ─── */
export async function listSubtasks(taskId) {
  const { data, error } = await supabase.from('subtasks').select('*').eq('task_id', taskId).order('created_at');
  if (error) throw error;
  return data;
}

export async function createSubtask(payload) {
  return insertSingleRow("subtasks", payload);
}

export async function updateSubtask(id, payload) {
  const { data, error } = await supabase.from('subtasks').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSubtask(id) {
  const { error } = await supabase.from('subtasks').delete().eq('id', id);
  if (error) throw error;
}

/* ─── PARTICIPANTS ─── */
export async function listParticipants(eventId) {
  const { data, error } = await supabase.from('event_participants').select('*').eq('event_id', eventId).order('name');
  if (error) return [];
  return data;
}

export async function addParticipant(payload) {
  return insertSingleRow("event_participants", payload);
}

export async function updateParticipant(id, payload) {
  const { data, error } = await supabase.from('event_participants').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteParticipant(id) {
  const { error } = await supabase.from('event_participants').delete().eq('id', id);
  if (error) throw error;
}

/* ─── ATTACHMENTS ─── */
export async function listAttachments(eventId) {
  const { data, error } = await supabase.from('attachments').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function addAttachment(payload) {
  return insertSingleRow("attachments", payload);
}

export async function deleteAttachment(id) {
  const { error } = await supabase.from('attachments').delete().eq('id', id);
  if (error) throw error;
}

/* ─── BRANDS ─── */
export async function listBrands() {
  const { data, error } = await supabase.from('brands').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createBrand(payload) {
  const { data, error } = await supabase.from('brands').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateBrand(id, payload) {
  const { data, error } = await supabase.from('brands').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/* ─── USERS ─── */
export async function listAvailableUsers() {
  const { data, error } = await supabase.from('available_users').select('*').order('full_name');
  if (error) return [];
  return data;
}

/* ─── AUDIT LOG ─── */
export async function listAuditLog(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error) return data || [];
  } catch {
    // fallback below
  }

  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error) return data || [];
  } catch {
    // fallback below
  }

  return [];
}

/* ─── STATS ─── */
export async function getDashboardStats(filters = {}) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const events = await listEvents({ brand: filters.brand || "", search: "", period: "" }).catch(() => []);
  const eventIds = (events || []).map((event) => event.id).filter(Boolean);

  const nowStamp = now.getTime();
  const yearStartStamp = new Date(startOfYear).getTime();
  const in30DaysStamp = new Date(in30Days).getTime();

  const totalEvents = (events || []).filter((event) => {
    const stamp = new Date(event.start_at || "").getTime();
    return Number.isFinite(stamp) && stamp >= yearStartStamp;
  }).length;
  const upcomingEvents = (events || []).filter((event) => {
    const stamp = new Date(event.start_at || "").getTime();
    return Number.isFinite(stamp) && stamp >= nowStamp && stamp <= in30DaysStamp;
  }).length;

  let confirmedParticipants = 0;
  let openTasks = 0;
  if (eventIds.length) {
    const [participantsRes, tasksRes] = await Promise.allSettled([
      supabase.from("event_participants").select("id", { count: "exact" }).eq("status", "confirmed").in("event_id", eventIds),
      supabase.from("tasks").select("id", { count: "exact" }).is("deleted_at", null).neq("status", "done").in("event_id", eventIds),
    ]);
    confirmedParticipants = participantsRes.status === "fulfilled" ? (participantsRes.value.count || 0) : 0;
    openTasks = tasksRes.status === "fulfilled" ? (tasksRes.value.count || 0) : 0;
  }

  return {
    totalEvents,
    upcomingEvents,
    confirmedParticipants,
    openTasks,
  };
}

const DEFAULT_BRAND_SETTINGS = [
  { brand_key: 'academy', label: 'Archer Academy', primary_color: '#1E3A5F', logo_url: '/archer-wordmark.png' },
  { brand_key: 'invest', label: 'Archer Invest', primary_color: '#2A6049', logo_url: '/brands/invest-logo.svg' },
  { brand_key: 'fund', label: 'Archer Investment Fund', primary_color: '#8B1A1A', logo_url: '/brands/fund-logo.png' },
];

const DEFAULT_BRAND_ACCESS = ['academy', 'invest', 'fund'];

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBrandAccess(value) {
  const list = Array.isArray(value) ? value : [];
  const normalized = [...new Set(list.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean))];
  return normalized.length ? normalized : [...DEFAULT_BRAND_ACCESS];
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  if (['superadmin', 'admin', 'operations', 'ops', 'viewer', 'finance', 'mentor'].includes(role)) {
    if (role === 'ops') return 'operations';
    return role;
  }
  return 'viewer';
}

function normalizeProfileRow(row = {}) {
  return {
    ...row,
    role: normalizeRole(row.role),
    brand_access: normalizeBrandAccess(row.brand_access),
    status: String(row.status || (row.is_active === false ? 'inactief' : 'actief')).trim().toLowerCase() || 'actief',
    full_name: row.full_name || row.name || '',
  };
}

function normalizeBrandKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'academy';
  if (raw === 'archer_academy' || raw === 'academy') return 'academy';
  if (raw === 'archer_invest' || raw === 'invest') return 'invest';
  if (raw === 'archer_fund' || raw === 'fund' || raw === 'investment fund') return 'fund';
  return raw;
}

function mergeBrandSettings(rows = []) {
  const mapped = (rows || []).map((row) => ({
    brand_key: normalizeBrandKey(row.brand_key || row.brand),
    label: row.label || row.brand_name || '',
    primary_color: row.primary_color || row.accent_color || '',
    logo_url: row.logo_url || '',
    updated_at: row.updated_at || row.created_at || null,
  }));

  const byKey = new Map();
  [...DEFAULT_BRAND_SETTINGS, ...mapped].forEach((row) => {
    if (!row?.brand_key) return;
    byKey.set(row.brand_key, {
      ...byKey.get(row.brand_key),
      ...row,
      brand_key: row.brand_key,
    });
  });

  return [...byKey.values()].sort((a, b) => a.brand_key.localeCompare(b.brand_key));
}

function parseJsonArray(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (!rawValue) return [];
  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeBudgetRows(value) {
  return parseJsonArray(value).map((entry) => ({
    ...entry,
    amount: toFiniteNumber(entry?.amount, 0),
    fee: toFiniteNumber(entry?.fee, 0),
    travel: toFiniteNumber(entry?.travel, 0),
  }));
}

function sumBudgetRows(rows = []) {
  return (rows || []).reduce((sum, row) => {
    const amount = toFiniteNumber(row?.amount, 0);
    const fee = toFiniteNumber(row?.fee, 0);
    const travel = toFiniteNumber(row?.travel, 0);
    return sum + amount + fee + travel;
  }, 0);
}

function toMonthKey(dateValue) {
  const date = new Date(dateValue || '');
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDateRangeForPeriod(period) {
  const now = new Date();
  const key = String(period || '').trim().toLowerCase();

  if (key === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  if (key === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    return {
      start: new Date(now.getFullYear(), quarter * 3, 1),
      end: new Date(now.getFullYear(), (quarter + 1) * 3, 1),
    };
  }

  if (key === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
    };
  }

  return null;
}

function inDateRange(value, range) {
  if (!range) return true;
  const stamp = new Date(value || '').getTime();
  if (!Number.isFinite(stamp)) return false;
  return stamp >= range.start.getTime() && stamp < range.end.getTime();
}

function computeCateringLineTotal(line = {}) {
  const quantity = Math.max(0, Math.round(toFiniteNumber(line.quantity, 0)));
  const unitPrice = toFiniteNumber(line.unit_price, 0);
  const vatRate = toFiniteNumber(line.vat_rate, 0);
  const subtotal = quantity * unitPrice;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  return {
    ...line,
    quantity,
    unit_price: unitPrice,
    vat_rate: vatRate,
    subtotal_excl_vat: subtotal,
    vat_amount: vatAmount,
    total_incl_vat: total,
  };
}

function normalizeCateringRow(row = {}, itemMap = new Map()) {
  const item = itemMap.get(row.catering_item_id) || {};
  const vatRate = row.vat_rate ?? item.vat_rate ?? 6;
  const unitPrice = row.unit_price_override ?? row.unit_price ?? item.unit_price ?? 0;

  return computeCateringLineTotal({
    id: row.id,
    event_id: row.event_id,
    catering_item_id: row.catering_item_id,
    name: row.name || item.name || 'Catering',
    category: row.category || item.category || 'Overig',
    unit: row.unit || item.unit || 'per persoon',
    quantity: row.quantity ?? 1,
    unit_price: unitPrice,
    vat_rate: vatRate,
    notes: row.notes || '',
    created_at: row.created_at || null,
  });
}

function normalizeBudgetRow(row = {}, eventParticipantCount = 0, cateringTotal = 0) {
  const locationCost = toFiniteNumber(row.location_cost, 0);
  const speakerCosts = normalizeBudgetRows(row.speaker_costs);
  const materialCosts = normalizeBudgetRows(row.material_costs);
  const marketingCosts = normalizeBudgetRows(row.marketing_costs);
  const otherCosts = normalizeBudgetRows(row.other_costs);
  const ticketPrice = toFiniteNumber(row.ticket_price, 0);
  const incomeOverride =
    row.income_override === null || row.income_override === undefined || row.income_override === ''
      ? null
      : toFiniteNumber(row.income_override, 0);

  const speakerTotal = sumBudgetRows(speakerCosts);
  const materialTotal = sumBudgetRows(materialCosts);
  const marketingTotal = sumBudgetRows(marketingCosts);
  const otherTotal = sumBudgetRows(otherCosts);
  const totalCosts = locationCost + cateringTotal + speakerTotal + materialTotal + marketingTotal + otherTotal;
  const totalIncome = incomeOverride !== null ? incomeOverride : eventParticipantCount * ticketPrice;
  const netResult = totalIncome - totalCosts;
  const breakEvenParticipants = ticketPrice > 0 ? totalCosts / ticketPrice : null;
  const costPerParticipant = eventParticipantCount > 0 ? totalCosts / eventParticipantCount : null;
  const marginPercent = totalIncome > 0 ? (netResult / totalIncome) * 100 : null;

  return {
    id: row.id || null,
    event_id: row.event_id || null,
    location_cost: locationCost,
    speaker_costs: speakerCosts,
    material_costs: materialCosts,
    marketing_costs: marketingCosts,
    other_costs: otherCosts,
    ticket_price: ticketPrice,
    income_override: incomeOverride,
    notes: row.notes || '',
    updated_at: row.updated_at || row.created_at || null,
    totals: {
      catering_total: cateringTotal,
      speaker_total: speakerTotal,
      material_total: materialTotal,
      marketing_total: marketingTotal,
      other_total: otherTotal,
      total_costs: totalCosts,
      total_income: totalIncome,
      net_result: netResult,
      break_even_participants: breakEvenParticipants,
      cost_per_participant: costPerParticipant,
      margin_percent: marginPercent,
    },
  };
}

export async function listProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeProfileRow);
}

export async function updateProfile(id, payload) {
  const updatePayload = {
    ...payload,
    role: normalizeRole(payload.role),
    brand_access: normalizeBrandAccess(payload.brand_access),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('profiles').update(updatePayload).eq('id', id).select().single();
  if (error) throw error;
  return normalizeProfileRow(data);
}

export async function uploadProfileAvatar(userId, file) {
  const extension = String(file?.name || 'avatar.png').split('.').pop() || 'png';
  const path = `${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = publicData?.publicUrl || '';
  if (!avatarUrl) throw new Error('Kon avatar URL niet ophalen.');

  const { error: profileError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
  if (profileError) throw profileError;

  return avatarUrl;
}

export async function listBrandSettings() {
  try {
    const { data, error } = await supabase
      .from('brand_settings')
      .select('brand_key,label,primary_color,logo_url,updated_at')
      .order('brand_key');
    if (!error) return mergeBrandSettings(data || []);
  } catch {
    // fallback below
  }

  try {
    const { data, error } = await supabase
      .from('brand_settings')
      .select('brand,brand_name,accent_color,logo_url,updated_at')
      .order('brand');
    if (!error) return mergeBrandSettings(data || []);
  } catch {
    // fallback below
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('brand,key,value')
      .in('key', ['brand_name', 'accent_color', 'logo_url']);
    if (error) throw error;

    const byBrand = (data || []).reduce((acc, row) => {
      const brand = normalizeBrandKey(row.brand);
      if (!acc[brand]) acc[brand] = { brand_key: brand };
      if (row.key === 'brand_name') acc[brand].label = row.value;
      if (row.key === 'accent_color') acc[brand].primary_color = row.value;
      if (row.key === 'logo_url') acc[brand].logo_url = row.value;
      return acc;
    }, {});
    return mergeBrandSettings(Object.values(byBrand));
  } catch {
    return mergeBrandSettings([]);
  }
}

export async function saveBrandSetting(setting) {
  const payload = {
    brand_key: normalizeBrandKey(setting.brand_key),
    label: setting.label || '',
    primary_color: setting.primary_color || '',
    logo_url: setting.logo_url || '',
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('brand_settings')
      .upsert(payload, { onConflict: 'brand_key' });
    if (!error) return payload;
  } catch {
    // fallback below
  }

  try {
    const legacyPayload = {
      brand: payload.brand_key,
      brand_name: payload.label,
      accent_color: payload.primary_color,
      logo_url: payload.logo_url,
      updated_at: payload.updated_at,
    };
    const { error } = await supabase.from('brand_settings').upsert(legacyPayload, { onConflict: 'brand' });
    if (!error) return payload;
  } catch {
    // fallback below
  }

  const { error } = await supabase
    .from('app_settings')
    .upsert(
      [
        { brand: payload.brand_key, key: 'brand_name', value: payload.label },
        { brand: payload.brand_key, key: 'accent_color', value: payload.primary_color },
        { brand: payload.brand_key, key: 'logo_url', value: payload.logo_url },
      ],
      { onConflict: 'brand,key' }
    );
  if (error) throw error;
  return payload;
}

export async function listAuditEntries(options = {}) {
  const limit = Math.max(1, Math.min(500, Number.parseInt(options.limit || 50, 10) || 50));
  const userId = String(options.userId || '').trim();
  const action = String(options.action || '').trim();

  try {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.ilike('action', `%${action}%`);
    const { data, error } = await query;
    if (!error) return data || [];
  } catch {
    // fallback below
  }

  try {
    let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.ilike('action', `%${action}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((entry) => ({
      id: entry.id,
      created_at: entry.created_at,
      user_id: entry.user_id || entry.actor_id || null,
      action: entry.action || entry.event || '',
      target_type: entry.target_type || entry.resource_type || entry.table_name || '',
      target_id: entry.target_id || entry.resource_id || entry.record_id || '',
      payload: entry.payload || entry.metadata || entry.new_values || null,
      ...entry,
    }));
  } catch {
    return [];
  }
}

export async function createAuditEntry(payload) {
  const entry = {
    user_id: payload.user_id || null,
    action: payload.action || 'update',
    target_type: payload.target_type || null,
    target_id: payload.target_id || null,
    payload: payload.payload || {},
  };

  try {
    const { error } = await supabase.from('audit_logs').insert(entry);
    if (!error) return;
  } catch {
    // fallback below
  }

  try {
    await supabase.from('audit_log').insert({
      user_id: entry.user_id,
      action: entry.action,
      resource_type: entry.target_type,
      resource_id: entry.target_id,
      metadata: entry.payload,
    });
  } catch {
    // best effort
  }
}

function mapCateringItem(row = {}) {
  return {
    id: row.id,
    name: row.name || row.title || '',
    category: row.category || row.type || 'Overig',
    type: row.type || row.category || 'eten',
    unit: row.unit || 'per persoon',
    unit_price: toFiniteNumber(row.unit_price ?? row.price_amount ?? row.price, 0),
    vat_rate: toFiniteNumber(row.vat_rate ?? row.vat ?? 6, 6),
    is_active: row.is_active !== false,
    brand_key: normalizeBrandKey(row.brand_key || row.brand || 'all'),
    notes: row.notes || row.description || '',
    created_at: row.created_at || null,
  };
}

export async function listCateringItems(filters = {}) {
  const includeInactive = !!filters.includeInactive;
  const brandKey = normalizeBrandKey(filters.brand_key || filters.brand || 'all');

  try {
    let query = supabase.from('catering_items').select('*').order('name');
    if (!includeInactive) query = query.eq('is_active', true);
    if (brandKey && brandKey !== 'all') query = query.in('brand_key', ['all', brandKey]);
    const { data, error } = await query;
    if (!error) return (data || []).map(mapCateringItem);
  } catch {
    // fallback below
  }

  let fallbackQuery = supabase.from('catering_options').select('*').order('name');
  if (!includeInactive) fallbackQuery = fallbackQuery.eq('is_active', true);
  const { data, error } = await fallbackQuery;
  if (error) throw error;
  return (data || [])
    .map((row) => mapCateringItem({ ...row, brand_key: normalizeBrandKey(row.brand || brandKey || 'all') }))
    .filter((row) => brandKey === 'all' || row.brand_key === 'all' || row.brand_key === brandKey);
}

export async function saveCateringItem(payload) {
  const itemPayload = {
    name: String(payload.name || '').trim(),
    category: String(payload.category || 'Overig').trim(),
    type: String(payload.type || payload.category || 'eten').trim(),
    unit: String(payload.unit || 'per persoon').trim(),
    unit_price: toFiniteNumber(payload.unit_price, 0),
    vat_rate: toFiniteNumber(payload.vat_rate, 6),
    is_active: payload.is_active !== false,
    brand_key: normalizeBrandKey(payload.brand_key || payload.brand || 'all'),
  };

  if (!itemPayload.name) throw new Error('Naam is verplicht.');

  try {
    if (payload.id) {
      const { data, error } = await supabase.from('catering_items').update(itemPayload).eq('id', payload.id).select().single();
      if (error) throw error;
      return mapCateringItem(data);
    }
    const { data, error } = await supabase.from('catering_items').insert(itemPayload).select().single();
    if (error) throw error;
    return mapCateringItem(data);
  } catch {
    const fallbackPayload = {
      brand: itemPayload.brand_key,
      name: itemPayload.name,
      description: payload.notes || '',
      price_amount: itemPayload.unit_price,
      price_currency: 'EUR',
      is_active: itemPayload.is_active,
      supplier_name: payload.supplier_name || '',
    };
    if (payload.id) {
      const { data, error } = await supabase
        .from('catering_options')
        .update(fallbackPayload)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return mapCateringItem(data);
    }
    const { data, error } = await supabase.from('catering_options').insert(fallbackPayload).select().single();
    if (error) throw error;
    return mapCateringItem(data);
  }
}

export async function deleteCateringItem(id) {
  try {
    const { error } = await supabase.from('catering_items').delete().eq('id', id);
    if (!error) return;
  } catch {
    // fallback below
  }

  const { error } = await supabase.from('catering_options').delete().eq('id', id);
  if (error) throw error;
}

export async function listEventCatering(eventId) {
  const items = await listCateringItems({ includeInactive: true }).catch(() => []);
  const itemMap = new Map(items.map((item) => [item.id, item]));

  try {
    const { data, error } = await supabase
      .from('event_catering')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => normalizeCateringRow(row, itemMap));
  } catch {
    const { data: eventRow, error: eventError } = await supabase.from('events').select('id,catering').eq('id', eventId).maybeSingle();
    if (eventError || !eventRow?.catering) return [];

    const match = items.find((item) => String(item.name || '').toLowerCase() === String(eventRow.catering || '').toLowerCase());
    if (!match) return [];

    return [
      normalizeCateringRow(
        {
          id: `legacy-${eventId}`,
          event_id: eventId,
          catering_item_id: match.id,
          quantity: 1,
          unit_price_override: match.unit_price,
          vat_rate: match.vat_rate,
        },
        itemMap
      ),
    ];
  }
}

export async function saveEventCateringLine(payload) {
  const basePayload = {
    event_id: payload.event_id,
    catering_item_id: payload.catering_item_id || null,
    quantity: Math.max(1, Math.round(toFiniteNumber(payload.quantity, 1))),
    unit_price_override:
      payload.unit_price_override === null || payload.unit_price_override === undefined || payload.unit_price_override === ''
        ? null
        : toFiniteNumber(payload.unit_price_override, 0),
    notes: payload.notes || null,
  };

  if (!basePayload.event_id) throw new Error('event_id is verplicht.');
  if (!basePayload.catering_item_id) throw new Error('catering_item_id is verplicht.');

  if (payload.id) {
    let updateQuery = supabase.from("event_catering").update(basePayload).eq("id", payload.id);
    if (shouldScopeByOwner()) updateQuery = updateQuery.eq("owner_id", authContext.userId);
    let { data, error } = await updateQuery.select().single();
    if (error && shouldScopeByOwner() && errorHasColumn(error, "owner_id")) {
      ({ data, error } = await supabase.from("event_catering").update(basePayload).eq("id", payload.id).select().single());
    }
    if (error) throw error;
    const rows = await listEventCatering(data.event_id);
    return rows.find((row) => row.id === data.id) || null;
  }

  const rowPayload = addOwnerContext(basePayload);
  let { data, error } = await supabase.from("event_catering").insert(rowPayload).select().single();
  if (error && rowPayload.owner_id && errorHasColumn(error, "owner_id")) {
    ({ data, error } = await supabase.from("event_catering").insert(removeOwnerContext(rowPayload)).select().single());
  }
  if (error) throw error;
  const rows = await listEventCatering(data.event_id);
  return rows.find((row) => row.id === data.id) || null;
}

export async function deleteEventCatering(id) {
  const { error } = await supabase.from('event_catering').delete().eq('id', id);
  if (error) throw error;
}

export async function getEventBudget(eventId, options = {}) {
  const participantsCount = Number.parseInt(options.participantsCount || 0, 10) || 0;
  const cateringLines = Array.isArray(options.cateringLines) ? options.cateringLines : await listEventCatering(eventId).catch(() => []);
  const cateringTotal = cateringLines.reduce((sum, line) => sum + toFiniteNumber(line.total_incl_vat, 0), 0);

  try {
    const { data, error } = await supabase.from('event_budget').select('*').eq('event_id', eventId).maybeSingle();
    if (error) throw error;
    if (!data) return normalizeBudgetRow({ event_id: eventId }, participantsCount, cateringTotal);
    return normalizeBudgetRow(data, participantsCount, cateringTotal);
  } catch {
    const { data: eventData, error } = await supabase.from('events').select('id,budget').eq('id', eventId).maybeSingle();
    if (error || !eventData) return normalizeBudgetRow({ event_id: eventId }, participantsCount, cateringTotal);
    return normalizeBudgetRow(
      {
        event_id: eventId,
        location_cost: eventData.budget || 0,
      },
      participantsCount,
      cateringTotal
    );
  }
}

export async function saveEventBudget(eventId, payload) {
  const basePayload = {
    event_id: eventId,
    location_cost: toFiniteNumber(payload.location_cost, 0),
    speaker_costs: JSON.stringify(normalizeBudgetRows(payload.speaker_costs)),
    material_costs: JSON.stringify(normalizeBudgetRows(payload.material_costs)),
    marketing_costs: JSON.stringify(normalizeBudgetRows(payload.marketing_costs)),
    other_costs: JSON.stringify(normalizeBudgetRows(payload.other_costs)),
    ticket_price: toFiniteNumber(payload.ticket_price, 0),
    income_override:
      payload.income_override === null || payload.income_override === undefined || payload.income_override === ''
        ? null
        : toFiniteNumber(payload.income_override, 0),
    notes: payload.notes || null,
    updated_at: new Date().toISOString(),
  };

  const rowPayload = addOwnerContext(basePayload);
  let { data, error } = await supabase.from("event_budget").upsert(rowPayload, { onConflict: "event_id" }).select().single();
  if (error && rowPayload.owner_id && errorHasColumn(error, "owner_id")) {
    ({ data, error } = await supabase
      .from("event_budget")
      .upsert(removeOwnerContext(rowPayload), { onConflict: "event_id" })
      .select()
      .single());
  }
  if (error) throw error;
  return data;
}

export async function getFinanceOverview(filters = {}) {
  const events = await listEvents({
    brand: filters.brand || '',
    search: filters.search || '',
    period: filters.period || '',
  });

  const statusFilterValues = getStatusFilterValues(filters.status);
  const periodRange = getDateRangeForPeriod(filters.period);
  const filteredEvents = events
    .filter((event) => {
      if (!statusFilterValues.length) return true;
      const statusValue = String(event.status || 'gepland').trim().toLowerCase();
      return statusFilterValues.includes(statusValue);
    })
    .filter((event) => inDateRange(event.start_at, periodRange));

  const eventIds = filteredEvents.map((event) => event.id).filter(Boolean);
  if (!eventIds.length) {
    return {
      rows: [],
      kpis: {
        total_costs: 0,
        total_income: 0,
        net_result: 0,
        avg_cost_per_event: 0,
      },
      monthly: [],
    };
  }

  const [budgetsRes, participantsRes, allItems] = await Promise.all([
    supabase.from('event_budget').select('*').in('event_id', eventIds),
    supabase.from('event_participants').select('event_id').in('event_id', eventIds),
    listCateringItems({ includeInactive: true }).catch(() => []),
  ]);

  const participantsByEvent = (participantsRes.data || []).reduce((acc, row) => {
    const key = row?.event_id;
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const budgetsByEvent = new Map((budgetsRes.data || []).map((row) => [row.event_id, row]));
  const itemMap = new Map(allItems.map((item) => [item.id, item]));

  let cateringRows = [];
  try {
    const { data } = await supabase.from('event_catering').select('*').in('event_id', eventIds);
    cateringRows = data || [];
  } catch {
    cateringRows = [];
  }

  const cateringByEvent = cateringRows.reduce((acc, row) => {
    const normalized = normalizeCateringRow(row, itemMap);
    if (!acc[normalized.event_id]) acc[normalized.event_id] = [];
    acc[normalized.event_id].push(normalized);
    return acc;
  }, {});

  const rows = filteredEvents.map((event) => {
    const participantsCount = participantsByEvent[event.id] || event.expected_attendance || 0;
    const lines = cateringByEvent[event.id] || [];
    const cateringTotal = lines.reduce((sum, line) => sum + toFiniteNumber(line.total_incl_vat, 0), 0);
    const budget = normalizeBudgetRow(budgetsByEvent.get(event.id) || { event_id: event.id }, participantsCount, cateringTotal);

    return {
      event_id: event.id,
      title: event.title,
      brand: event.brand,
      start_at: event.start_at,
      status: event.status || 'gepland',
      participants_count: participantsCount,
      totals: budget.totals,
      budget,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.total_costs += toFiniteNumber(row.totals.total_costs, 0);
      acc.total_income += toFiniteNumber(row.totals.total_income, 0);
      return acc;
    },
    { total_costs: 0, total_income: 0 }
  );
  totals.net_result = totals.total_income - totals.total_costs;
  totals.avg_cost_per_event = rows.length ? totals.total_costs / rows.length : 0;

  const monthlyMap = rows.reduce((acc, row) => {
    const key = toMonthKey(row.start_at);
    if (!key) return acc;
    if (!acc[key]) acc[key] = { month: key, costs: 0, income: 0 };
    acc[key].costs += toFiniteNumber(row.totals.total_costs, 0);
    acc[key].income += toFiniteNumber(row.totals.total_income, 0);
    return acc;
  }, {});

  const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  return {
    rows,
    kpis: totals,
    monthly,
  };
}

export function buildFinanceCsvRows(rows = []) {
  return rows.map((row) => ({
    event_naam: row.title || '',
    brand: row.brand || '',
    datum: row.start_at || '',
    status: row.status || '',
    totale_kost: Number(toFiniteNumber(row?.totals?.total_costs, 0)).toFixed(2),
    totale_inkomst: Number(toFiniteNumber(row?.totals?.total_income, 0)).toFixed(2),
    netto_resultaat: Number(toFiniteNumber(row?.totals?.net_result, 0)).toFixed(2),
    deelnemers: Number(row.participants_count || 0),
  }));
}

export function buildParticipantsCsvRows(rows = []) {
  return (rows || []).map((row) => ({
    naam: row.name || '',
    'e-mail': row.email || '',
    brand: row.brand || '',
    status: row.status || '',
  }));
}
