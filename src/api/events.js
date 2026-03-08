import { listEvents as listStoreEvents, createEvent, updateEvent, deleteEvent } from "../store.js";

const ACADEMY_BRAND = "Academy";
const DEFAULT_LOCATION = "Archer kantoor Antwerpen";
const DEFAULT_CITY = "Antwerpen";
const DEFAULT_STATUS = "gepland";

function startOfLocalDay(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfTodayIsoLocal() {
  return startOfLocalDay().toISOString();
}

function toDateTimeString(date, time = "09:00") {
  return `${date}T${time}:00`;
}

function toDateRangePreset(period) {
  const value = String(period || "").trim().toLowerCase();
  if (!value) return null;
  if (value === "year_2026") return { start: "2026-01-01", end: "2026-12-31T23:59:59" };
  if (value === "q1_2026") return { start: "2026-01-01", end: "2026-03-31T23:59:59" };
  if (value === "q2_2026") return { start: "2026-04-01", end: "2026-06-30T23:59:59" };
  if (value === "q3_2026") return { start: "2026-07-01", end: "2026-09-30T23:59:59" };
  if (value === "q4_2026") return { start: "2026-10-01", end: "2026-12-31T23:59:59" };
  return null;
}

export function inferEventCategory(event = {}) {
  const rawCategory = String(event.category || "").trim().toLowerCase();
  if (rawCategory === "mentorship") return "Mentorship";
  if (rawCategory === "1-op-1" || rawCategory === "1op1" || rawCategory === "1 op 1") return "1-op-1";

  const title = String(event.title || "").trim().toLowerCase();
  if (title.includes("mentorship")) return "Mentorship";
  if (title.includes("1-op-1") || title.includes("1op1") || title.includes("1 op 1")) return "1-op-1";
  return "Academy algemeen";
}

function filterByCategory(events = [], categoryFilter = "") {
  const normalizedFilter = String(categoryFilter || "").trim().toLowerCase();
  if (!normalizedFilter) return events;
  return events.filter((event) => inferEventCategory(event).toLowerCase() === normalizedFilter);
}

function sortByStartAt(events = [], ascending = true) {
  return [...events].sort((a, b) => {
    const aStamp = new Date(a.start_at || a.event_date || "").getTime();
    const bStamp = new Date(b.start_at || b.event_date || "").getTime();
    if (!Number.isFinite(aStamp) && !Number.isFinite(bStamp)) return 0;
    if (!Number.isFinite(aStamp)) return 1;
    if (!Number.isFinite(bStamp)) return -1;
    return ascending ? aStamp - bStamp : bStamp - aStamp;
  });
}

export async function listEventsChronological(filters = {}) {
  const view = String(filters.view || "upcoming").trim().toLowerCase() === "past" ? "past" : "upcoming";
  const fromDate = String(filters.fromDate || startOfTodayIsoLocal());
  const periodRange = toDateRangePreset(filters.period);

  const storeFilters = {
    brand: filters.brand || "",
    search: filters.search || "",
    status: filters.status || "",
    period: ["month", "quarter", "year"].includes(String(filters.period || "").trim().toLowerCase()) ? filters.period : "",
    dateFrom: filters.dateFrom || "",
    dateTo: filters.dateTo || "",
  };

  if (periodRange) {
    storeFilters.dateFrom = periodRange.start;
    storeFilters.dateTo = periodRange.end;
  }

  // Gebruik lokale dagstart als standaard scheiding tussen "komend" en "voorbij".
  if (view === "upcoming" && !storeFilters.dateFrom) {
    storeFilters.dateFrom = fromDate;
  }

  const allRows = await listStoreEvents(storeFilters);
  const pivot = new Date(fromDate).getTime();

  const rowsForView = (allRows || []).filter((row) => {
    const stamp = new Date(row.start_at || row.event_date || "").getTime();
    if (!Number.isFinite(stamp)) return false;
    if (view === "past") return stamp < pivot;
    return stamp >= pivot;
  });

  const categoryFiltered = filterByCategory(rowsForView, filters.category);
  return sortByStartAt(categoryFiltered, view !== "past");
}

function buildEventRow({
  title,
  date,
  startTime = "09:00",
  endTime = "16:00",
  category,
  level,
  catering,
}) {
  return {
    brand: ACADEMY_BRAND,
    title,
    start_at: toDateTimeString(date, startTime),
    end_at: toDateTimeString(date, endTime),
    event_date: date,
    location: DEFAULT_LOCATION,
    city: DEFAULT_CITY,
    category,
    level,
    catering,
    status: DEFAULT_STATUS,
    timezone: "Europe/Brussels",
    description: `${category} - ${level}. Catering: ${catering}.`,
  };
}

function buildMentorshipAndOneOnOneRows2026() {
  const rows = [];

  const mentorshipKickoffs = [
    { quarter: "Q1", part: 1, date: "2026-01-15", level: "Starters" },
    { quarter: "Q1", part: 2, date: "2026-02-05", level: "Gevorderden" },
    { quarter: "Q2", part: 1, date: "2026-04-09", level: "Starters" },
    { quarter: "Q2", part: 2, date: "2026-04-30", level: "Gevorderden" },
    { quarter: "Q3", part: 1, date: "2026-07-09", level: "Starters" },
    { quarter: "Q3", part: 2, date: "2026-07-30", level: "Gevorderden" },
    { quarter: "Q4", part: 1, date: "2026-10-08", level: "Starters" },
    { quarter: "Q4", part: 2, date: "2026-10-29", level: "Gevorderden" },
  ];

  mentorshipKickoffs.forEach((item) => {
    rows.push(
      buildEventRow({
        title: `Mentorship Kick-off ${item.quarter} - Deel ${item.part}`,
        date: item.date,
        startTime: "09:00",
        endTime: "16:00",
        category: "Mentorship",
        level: item.level,
        catering: "Drank & lunch",
      })
    );
  });

  const mentorshipLiveDays = [
    { month: "januari", date: "2026-01-22" },
    { month: "april", date: "2026-04-23" },
    { month: "juli", date: "2026-07-23" },
    { month: "oktober", date: "2026-10-22" },
  ];

  mentorshipLiveDays.forEach((item) => {
    rows.push(
      buildEventRow({
        title: `Mentorship Livedag ${item.month}`,
        date: item.date,
        startTime: "09:00",
        endTime: "16:00",
        category: "Mentorship",
        level: "Gemengd",
        catering: "Drank, snacks & lunch",
      })
    );
  });

  const oneOnOneKickoffs = [
    { quarter: "Q1", part: 1, date: "2026-01-08" },
    { quarter: "Q1", part: 2, date: "2026-01-15" },
    { quarter: "Q1", part: 3, date: "2026-01-22" },
    { quarter: "Q1", part: 4, date: "2026-01-29" },
    { quarter: "Q2", part: 1, date: "2026-04-02" },
    { quarter: "Q2", part: 2, date: "2026-04-09" },
    { quarter: "Q2", part: 3, date: "2026-04-16" },
    { quarter: "Q2", part: 4, date: "2026-04-23" },
    { quarter: "Q3", part: 1, date: "2026-07-02" },
    { quarter: "Q3", part: 2, date: "2026-07-09" },
    { quarter: "Q3", part: 3, date: "2026-07-16" },
    { quarter: "Q3", part: 4, date: "2026-07-23" },
    { quarter: "Q4", part: 1, date: "2026-10-01" },
    { quarter: "Q4", part: 2, date: "2026-10-08" },
    { quarter: "Q4", part: 3, date: "2026-10-15" },
    { quarter: "Q4", part: 4, date: "2026-10-22" },
  ];

  oneOnOneKickoffs.forEach((item) => {
    const level = item.part <= 2 ? "Starters" : "Gevorderden";
    rows.push(
      buildEventRow({
        title: `1-op-1 Kick-off ${item.quarter} - Deel ${item.part}`,
        date: item.date,
        startTime: "09:00",
        endTime: "16:00",
        category: "1-op-1",
        level,
        catering: "Drank & lunch",
      })
    );
  });

  const oneOnOneLiveDays = [
    { month: "januari", date: "2026-01-14" },
    { month: "februari", date: "2026-02-11" },
    { month: "maart", date: "2026-03-11" },
    { month: "april", date: "2026-04-15" },
    { month: "mei", date: "2026-05-13" },
    { month: "juni", date: "2026-06-10" },
    { month: "juli", date: "2026-07-15" },
    { month: "augustus", date: "2026-08-12" },
    { month: "september", date: "2026-09-16" },
    { month: "oktober", date: "2026-10-14" },
    { month: "november", date: "2026-11-11" },
    { month: "december", date: "2026-12-09" },
  ];

  oneOnOneLiveDays.forEach((item) => {
    rows.push(
      buildEventRow({
        title: `1-op-1 Livedag ${item.month}`,
        date: item.date,
        startTime: "09:00",
        endTime: "16:00",
        category: "1-op-1",
        level: "Gemengd",
        catering: "Drank & lunch",
      })
    );
  });

  return rows;
}

function eventUpsertKey(row = {}) {
  return `${String(row.brand || "").trim().toLowerCase()}|${String(row.title || "").trim().toLowerCase()}|${String(row.start_at || "").trim()}`;
}

export async function seedArcherAcademyEvents2026(supabaseClient) {
  if (!supabaseClient) throw new Error("Supabase client ontbreekt voor import.");

  const rows = buildMentorshipAndOneOnOneRows2026();
  const { data: existingRows, error: existingError } = await supabaseClient
    .from("events")
    .select("brand,title,start_at")
    .eq("brand", ACADEMY_BRAND)
    .gte("start_at", "2026-01-01")
    .lte("start_at", "2026-12-31T23:59:59");

  if (existingError) throw existingError;

  const existingKeys = new Set((existingRows || []).map(eventUpsertKey));
  const inserted = rows.filter((row) => !existingKeys.has(eventUpsertKey(row))).length;
  const updated = rows.length - inserted;

  const { error: upsertError } = await supabaseClient
    .from("events")
    .upsert(rows, { onConflict: "brand,title,start_at" });

  if (!upsertError) {
    return { total: rows.length, inserted, updated, mode: "upsert" };
  }

  const canFallback = String(upsertError?.message || "").toLowerCase().includes("unique");
  if (!canFallback) throw upsertError;

  let fallbackInserted = 0;
  let fallbackUpdated = 0;
  for (const row of rows) {
    const { data: found, error: findError } = await supabaseClient
      .from("events")
      .select("id")
      .eq("brand", row.brand)
      .eq("title", row.title)
      .eq("start_at", row.start_at)
      .maybeSingle();

    if (findError && findError.code !== "PGRST116") throw findError;

    if (found?.id) {
      const { error: updateError } = await supabaseClient.from("events").update(row).eq("id", found.id);
      if (updateError) throw updateError;
      fallbackUpdated += 1;
    } else {
      const { error: insertError } = await supabaseClient.from("events").insert([row]);
      if (insertError) throw insertError;
      fallbackInserted += 1;
    }
  }

  return {
    total: rows.length,
    inserted: fallbackInserted,
    updated: fallbackUpdated,
    mode: "fallback",
  };
}

export async function importMentorshipAndOneOnOneEvents2026(supabaseClient) {
  return seedArcherAcademyEvents2026(supabaseClient);
}

export const eventsApi = {
  list(filters = {}) {
    return listEventsChronological(filters);
  },
  create(payload) {
    return createEvent(payload);
  },
  update(id, payload) {
    return updateEvent(id, payload);
  },
  remove(id) {
    return deleteEvent(id);
  },
};
