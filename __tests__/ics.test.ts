import { busyFromIcs } from '@/features/care/ics';
import { icsFor } from '@/lib/calendar';

const file = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'SUMMARY:Board meeting',
  'DTSTART:20260928T000000Z',
  'DTEND:20260928T013000Z',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Australia/Brisbane:20260929T140000',
  'DTEND;TZID=Australia/Brisbane:20260929T',
  ' 150000',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:Public holiday',
  'DTSTART;VALUE=DATE:20260930',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261001T090000',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261002T090000',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('busy times from a calendar file', () => {
  const busy = busyFromIcs(file);

  it('reads start and end times, UTC or local, including folded lines', () => {
    expect(busy[0]).toEqual({ start: new Date(Date.UTC(2026, 8, 28, 0, 0)), end: new Date(Date.UTC(2026, 8, 28, 1, 30)) });
    expect(busy[1]).toEqual({ start: new Date(2026, 8, 29, 14, 0), end: new Date(2026, 8, 29, 15, 0) });
  });

  it('skips all-day and cancelled events; an event with no end blocks an hour', () => {
    expect(busy).toHaveLength(3);
    expect(busy[2]).toEqual({ start: new Date(2026, 9, 2, 9), end: new Date(2026, 9, 2, 10) });
  });

  it('keeps only the window asked for, and reads WATL’s own reminders back', () => {
    expect(busyFromIcs(file, new Date(2026, 9, 1), new Date(2026, 9, 3))).toHaveLength(1);
    const ours = icsFor({ title: 'Book Paula', start: new Date(Date.UTC(2026, 9, 5, 23)), minutes: 15, details: 'x' });
    expect(busyFromIcs(ours)).toEqual([{ start: new Date(Date.UTC(2026, 9, 5, 23)), end: new Date(Date.UTC(2026, 9, 5, 23, 15)) }]);
  });
});
