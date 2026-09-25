import { PROFESSIONS, type Profession } from './engine/types';

// Match feedback (PRD §49): the 1–5 rating and per-match thumbs, stored for the team to analyse.
// Numbers and ids, plus, after a 5 or a 1–2, the reasons picked and an optional short note (the
// only free text; the screen asks for no health details). Pure validation lives here so it's
// testable; api/feedback.ts does the storing.

/** The preselected answers to "What was good?" (a 5) and "What was off?" (a 1 or 2). */
export const WHY = {
  good: [
    { id: 'got_it', label: 'Got what I need' },
    { id: 'clear_why', label: 'Clear why they fit' },
    { id: 'cost_upfront', label: 'Cost upfront' },
    { id: 'available', label: 'Available soon' },
    { id: 'place', label: 'Right place or telehealth' },
    { id: 'range', label: 'Good range of people' },
  ],
  off: [
    { id: 'not_my_need', label: 'Not what I need' },
    { id: 'unclear_why', label: 'Unclear why they fit' },
    { id: 'too_costly', label: 'Too expensive' },
    { id: 'too_far', label: 'Too far away' },
    { id: 'waits', label: 'Waits too long' },
    { id: 'too_few', label: 'Too few people' },
  ],
} as const;

export const whyKind = (rating: number): keyof typeof WHY | null => (rating === 5 ? 'good' : rating <= 2 ? 'off' : null);
export const NOTE_MAX = 300;

export type Feedback = {
  rating: number;
  matches: number;
  followups: number;
  seconds: number;
  profession: Profession | 'either';
  claude: boolean;
  thumbs: Record<string, 'up' | 'down'>;
  /** After a 5 or a 1–2: the reasons picked (ids from WHY) and an optional note. */
  why?: { reasons: string[]; note?: string };
};

const ID = /^[a-z0-9-]{1,48}$/;
const int = (v: unknown, min: number, max: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : null);

/** Parse and bound a feedback body; null when it isn't valid. Unknown fields are dropped. */
export function parseFeedback(body: unknown): Feedback | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const rating = int(b.rating, 1, 5);
  const matches = int(b.matches, 0, 100);
  const followups = int(b.followups, 0, 10);
  const seconds = int(b.seconds, 0, 86_400);
  const profession = b.profession === 'either' || (PROFESSIONS as readonly unknown[]).includes(b.profession) ? (b.profession as Feedback['profession']) : null;
  if (rating === null || matches === null || followups === null || seconds === null || !profession) return null;
  const thumbs: Feedback['thumbs'] = {};
  for (const [id, dir] of Object.entries((b.thumbs ?? {}) as Record<string, unknown>).slice(0, 50)) {
    if (ID.test(id) && (dir === 'up' || dir === 'down')) thumbs[id] = dir;
  }
  const f: Feedback = { rating, matches, followups, seconds, profession, claude: b.claude === true, thumbs };
  const kind = whyKind(rating);
  const w = (b.why ?? null) as { reasons?: unknown; note?: unknown } | null;
  if (kind && w) {
    const known = new Set<string>(WHY[kind].map((o) => o.id));
    const reasons = [...new Set(Array.isArray(w.reasons) ? w.reasons.filter((r): r is string => typeof r === 'string' && known.has(r)) : [])];
    const note = typeof w.note === 'string' ? w.note.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX) : '';
    if (reasons.length || note) f.why = note ? { reasons, note } : { reasons };
  }
  return f;
}

/** What's stored: the feedback plus the day (not the time), so entries can't be tied to a session. */
export const toRecord = (f: Feedback, now = new Date()) => ({ ...f, day: now.toISOString().slice(0, 10) });
