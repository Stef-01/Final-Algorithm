import { Linking, Platform } from 'react-native';

import { addToDeviceCalendar } from './deviceCalendar';

// "Add to calendar" without asking for calendar access: an .ics file (Apple Calendar, Outlook,
// and most others open it) or a prefilled Google Calendar page. The event is a reminder to book.

export type CalendarEvent = { title: string; start: Date; minutes: number; details: string; url?: string };

const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}00Z`;
const end = (e: CalendarEvent) => new Date(e.start.getTime() + e.minutes * 60_000);
/** RFC 5545 text: escape backslashes, commas, semicolons and newlines. */
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

export function icsFor(e: CalendarEvent, uid = `${e.start.getTime()}-${e.title.length}@watl`): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WATL//Care plan//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end(e))}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(e.details + (e.url ? `\n${e.url}` : ''))}`,
    ...(e.url ? [`URL:${e.url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(end(e))}`,
    details: e.details + (e.url ? `\n${e.url}` : ''),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/**
 * Web: download the .ics or open Google Calendar. Phone: the device calendar (asks once), falling
 * back to Google Calendar if that isn't possible. Resolves to where it went.
 */
export async function addToCalendar(e: CalendarEvent, how: 'ics' | 'google'): Promise<'device' | 'ics' | 'google'> {
  if (Platform.OS !== 'web' && (await addToDeviceCalendar(e))) return 'device';
  if (how === 'ics' && Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([icsFor(e)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${e.title.replace(/[^\w]+/g, '-').toLowerCase()}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return 'ics';
  }
  void Linking.openURL(googleCalendarUrl(e));
  return 'google';
}
