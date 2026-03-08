function toDate(value) {
  const date = new Date(value || "");
  return Number.isFinite(date.getTime()) ? date : null;
}

function ensureEndDate(startDate, endDate) {
  if (endDate) return endDate;
  return new Date(startDate.getTime() + 60 * 60 * 1000);
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function toUtcCompact(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function normalizeEventPayload(event = {}) {
  const startDate = toDate(event.start_at || event.event_date);
  if (!startDate) {
    throw new Error("Geen geldige startdatum voor agenda-export.");
  }

  const endDate = ensureEndDate(startDate, toDate(event.end_at));
  const title = String(event.title || "Archer Event").trim() || "Archer Event";
  const description = String(event.description || event.notes_internal || "").trim();
  const location = String(event.location || "").trim();

  return {
    id: event.id || null,
    title,
    description,
    location,
    startDate,
    endDate,
  };
}

export function buildGoogleCalendarUrl(event) {
  const payload = normalizeEventPayload(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: payload.title,
    dates: `${toUtcCompact(payload.startDate)}/${toUtcCompact(payload.endDate)}`,
    details: payload.description,
    location: payload.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(event) {
  const payload = normalizeEventPayload(event);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: payload.title,
    body: payload.description,
    location: payload.location,
    startdt: payload.startDate.toISOString(),
    enddt: payload.endDate.toISOString(),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadIcsFile(event) {
  const payload = normalizeEventPayload(event);
  const uid = payload.id ? `${payload.id}@archer-events` : `${Date.now()}@archer-events`;
  const stamp = toUtcCompact(new Date());

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Archer Events//Calendar Export//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toUtcCompact(payload.startDate)}`,
    `DTEND:${toUtcCompact(payload.endDate)}`,
    `SUMMARY:${escapeIcsText(payload.title)}`,
    `DESCRIPTION:${escapeIcsText(payload.description)}`,
    `LOCATION:${escapeIcsText(payload.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const filenameSeed = payload.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "archer-event";
  const filename = `${filenameSeed}.ics`;

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}
