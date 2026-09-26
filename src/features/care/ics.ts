import type { Busy } from './slots';

// Busy times from a calendar file (.ics, the export every calendar app offers), read on the device:
// for "both free" on the web, where WATL can't open your calendar directly. Only start and end
// times are read; titles and details are ignored and nothing is sent anywhere. All-day events
// don't block times (they're usually holidays and birthdays). Repeating events count once, at their
// first date: the file lists the rule, not every repeat.

/** Lines folded onto the next line (RFC 5545 §3.1) joined back up. */
const unfold = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');

/** A DTSTART/DTEND value: UTC ("Z"), floating local time, or a date alone (all-day: null). */
function when(line: string): Date | null {
  const [params, value] = [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()];
  if (/VALUE=DATE(?!-)/.test(params) || /^\d{8}$/.test(value)) return null;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  return z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) : new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

export function busyFromIcs(text: string, from?: Date, to?: Date): Busy[] {
  const out: Busy[] = [];
  for (const block of unfold(text).split('BEGIN:VEVENT').slice(1)) {
    const body = block.split('END:VEVENT')[0];
    const lines = body.split('\n');
    const start = lines.find((l) => l.startsWith('DTSTART'));
    const end = lines.find((l) => l.startsWith('DTEND'));
    if (!start || /^STATUS:CANCELLED/m.test(body) || /^TRANSP:TRANSPARENT/m.test(body)) continue;
    const s = when(start);
    if (!s) continue;
    const e = (end && when(end)) || new Date(s.getTime() + 60 * 60 * 1000);
    if (from && e < from) continue;
    if (to && s > to) continue;
    out.push({ start: s, end: e });
  }
  return out;
}

/** Web only: ask for a calendar file and read its busy times. Null if cancelled or unreadable. */
export function pickCalendarFile(): Promise<Busy[] | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ics,text/calendar';
    // Closing the picker without choosing (supported in current browsers).
    (input as HTMLInputElement & { oncancel: (() => void) | null }).oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const now = new Date();
        resolve(busyFromIcs(await file.text(), now, new Date(now.getTime() + 70 * 24 * 60 * 60 * 1000)));
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
