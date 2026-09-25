// A suggested appointment time for each step of the care plan: the first hour, on or after the
// day the plan says to book, that is (a) past the practice's published wait, (b) on a day they
// work (weekends only if they say so), and (c) free in your calendar, if you let WATL read it.
// WATL can't see practices' live diaries, so their side is an estimate; the screen says so.

export type Busy = { start: Date; end: Date };

const HOURS = [9, 10, 11, 13, 14, 15, 16];
const DAY = 24 * 60 * 60 * 1000;

const atHour = (d: Date, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0);
const overlaps = (s: Date, e: Date, b: Busy) => s < b.end && e > b.start;

export function suggestSlot({
  from,
  waitDays,
  weekends,
  busy = [],
  now = new Date(),
}: {
  /** The day the plan suggests booking. */
  from: Date;
  /** The practice's published wait for a new patient; null = not published. */
  waitDays: number | null;
  /** Only `true` means weekend appointments. */
  weekends: boolean | null;
  busy?: Busy[];
  now?: Date;
}): Date | null {
  const earliest = new Date(Math.max(from.getTime(), now.getTime() + (waitDays ?? 0) * DAY, now.getTime() + 60 * 60 * 1000));
  for (let i = 0; i < 28; i++) {
    const day = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate() + i);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    if (weekend && weekends !== true) continue;
    for (const h of HOURS) {
      const start = atHour(day, h);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      if (start < earliest) continue;
      if (busy.some((b) => overlaps(start, end, b))) continue;
      return start;
    }
  }
  return null;
}

const DATE = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

/** "Tue 30 Sep · 10 am" */
export function slotLabel(d: Date) {
  const h = d.getHours();
  const time = `${h % 12 || 12}${d.getMinutes() ? `:${String(d.getMinutes()).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
  // Built from parts: engines differ on the comma after the weekday.
  const part = (t: string) => DATE.formatToParts(d).find((x) => x.type === t)?.value ?? '';
  return `${part('weekday')} ${part('day')} ${part('month')} · ${time}`;
}
