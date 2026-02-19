import { supabase } from "./supabaseClient.js";
import { getBrandAliases, resolveBrandKey } from "./config.js";

export const store = {
  brandId: "academy",
};

function normalizePeriodFilter(period) {
  const value = String(period || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "this_month" || value === "month") return "month";
  if (value === "this_quarter" || value === "quarter") return "quarter";
  if (value === "this_year" || value === "year") return "year";
  return "";
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

/* ─── EVENTS ─── */
export async function listEvents(filters = {}) {
  let query = supabase
    .from('events')
    .select('*')
    .is('deleted_at', null)
    .order('start_at', { ascending: true });

  const brandFilterValues = getBrandFilterValues(filters.brand);
  if (brandFilterValues.length === 1) {
    query = query.eq('brand', brandFilterValues[0]);
  } else if (brandFilterValues.length > 1) {
    query = query.in('brand', brandFilterValues);
  }

  if (filters.search) query = query.ilike('title', `%${filters.search}%`);

  // Date range filtering
  const normalizedPeriod = normalizePeriodFilter(filters.period);
  const bounds = getPeriodBounds(normalizedPeriod);
  if (bounds) {
    query = query.gte('start_at', bounds.start.toISOString()).lt('start_at', bounds.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(e => ({ ...e, start_at: e.start_at || e.event_date }));
}

export async function createEvent(payload) {
  if (!payload.timezone) payload.timezone = 'Europe/Brussels';
  // Compatibility: Map start_at -> event_date for legacy columns
  if (payload.start_at) payload.event_date = payload.start_at;

  const { data, error } = await supabase.from('events').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, payload) {
  if (payload.start_at) payload.event_date = payload.start_at;
  const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', id);
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
  const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase.from('subtasks').insert([payload]).select().single();
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase.from('event_participants').insert([payload]).select().single();
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase.from('attachments').insert([payload]).select().single();
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return data;
}

/* ─── STATS ─── */
export async function getDashboardStats() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const [eventsRes, upcomingRes, participantsRes, tasksRes] = await Promise.allSettled([
    supabase.from('events').select('id', { count: 'exact' }).is('deleted_at', null).gte('start_at', startOfYear),
    supabase.from('events').select('id', { count: 'exact' }).is('deleted_at', null).gte('start_at', now.toISOString()).lte('start_at', in30Days),
    supabase.from('event_participants').select('id', { count: 'exact' }).eq('status', 'confirmed'),
    supabase.from('tasks').select('id', { count: 'exact' }).is('deleted_at', null).neq('status', 'done'),
  ]);

  return {
    totalEvents: eventsRes.status === 'fulfilled' ? (eventsRes.value.count || 0) : 0,
    upcomingEvents: upcomingRes.status === 'fulfilled' ? (upcomingRes.value.count || 0) : 0,
    confirmedParticipants: participantsRes.status === 'fulfilled' ? (participantsRes.value.count || 0) : 0,
    openTasks: tasksRes.status === 'fulfilled' ? (tasksRes.value.count || 0) : 0,
  };
}
