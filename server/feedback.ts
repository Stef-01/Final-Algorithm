// Match feedback (PRD §49): the 1–5 rating and per-match thumbs, stored for the team to analyse.
// Numbers and ids only: never anything the patient wrote. Pure validation lives here so it's
// testable; api/feedback.ts does the storing.

export type Feedback = {
  rating: number;
  matches: number;
  followups: number;
  seconds: number;
  profession: 'gp' | 'psychologist' | 'either';
  claude: boolean;
  thumbs: Record<string, 'up' | 'down'>;
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
  const profession = b.profession === 'gp' || b.profession === 'psychologist' || b.profession === 'either' ? b.profession : null;
  if (rating === null || matches === null || followups === null || seconds === null || !profession) return null;
  const thumbs: Feedback['thumbs'] = {};
  for (const [id, dir] of Object.entries((b.thumbs ?? {}) as Record<string, unknown>).slice(0, 50)) {
    if (ID.test(id) && (dir === 'up' || dir === 'down')) thumbs[id] = dir;
  }
  return { rating, matches, followups, seconds, profession, claude: b.claude === true, thumbs };
}

/** What's stored: the feedback plus the day (not the time), so entries can't be tied to a session. */
export const toRecord = (f: Feedback, now = new Date()) => ({ ...f, day: now.toISOString().slice(0, 10) });
