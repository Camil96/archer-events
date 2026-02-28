import { Event } from '@/types';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const buildIcsFile = (event: Event) => {
  const uid = event.ics_uid || event.id;
  const start = formatDate(event.start_at);
  const end = formatDate(event.end_at || event.start_at);
  const title = event.title || 'Event';
  const location = event.location || '';
  const description = event.description || '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Archer Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
};

const escapeText = (text: string) => String(text).replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

export const googleCalendarUrl = (event: Event) => {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams({
    text: event.title || 'Event',
    dates: `${formatDate(event.start_at)}/${formatDate(event.end_at || event.start_at)}`,
    details: event.description || '',
    location: event.location || '',
  });
  return `${base}&${params.toString()}`;
};

export const outlookCalendarUrl = (event: Event) => {
  const base = 'https://outlook.live.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: event.start_at,
    enddt: event.end_at || event.start_at,
    subject: event.title || 'Event',
    body: event.description || '',
    location: event.location || '',
  });
  return `${base}?${params.toString()}`;
};
