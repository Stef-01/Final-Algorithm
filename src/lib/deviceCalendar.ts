import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import type { CalendarEvent } from './calendar';

// On a phone: put the reminder straight into the device's calendar, after asking once
// (write-only on iOS). Returns false if it can't (refused, no writable calendar, web), so the
// caller falls back to Google Calendar.
export async function addToDeviceCalendar(e: CalendarEvent): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const perm = await Calendar.requestCalendarPermissions(true);
    if (!perm.granted) return false;
    const calendar =
      Platform.OS === 'ios'
        ? Calendar.getDefaultCalendarSync()
        : ((await Calendar.getCalendars()).find((c) => c.allowsModifications && c.isPrimary) ??
          (await Calendar.getCalendars()).find((c) => c.allowsModifications));
    if (!calendar) return false;
    await calendar.createEvent({
      title: e.title,
      startDate: e.start,
      endDate: new Date(e.start.getTime() + e.minutes * 60_000),
      notes: e.details,
      url: e.url,
      alarms: [{ relativeOffset: -30 }],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Busy times from the phone's calendars, to suggest when you're free. Asks for read access (full
 * access on iOS) only when you tap to check. Times only: titles and details are never read out or
 * sent anywhere. Null if it can't (refused, web).
 */
export async function busyTimes(from: Date, to: Date): Promise<{ start: Date; end: Date }[] | null> {
  if (Platform.OS === 'web') return null;
  try {
    const perm = await Calendar.requestCalendarPermissions(false);
    if (!perm.granted) return null;
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    if (!calendars.length) return [];
    const events = await Calendar.listEvents(calendars, from, to);
    return events
      .filter((e) => !e.allDay && e.startDate && e.endDate)
      .map((e) => ({ start: new Date(e.startDate!), end: new Date(e.endDate!) }));
  } catch {
    return null;
  }
}
