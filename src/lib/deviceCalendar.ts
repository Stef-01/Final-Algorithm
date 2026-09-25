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
