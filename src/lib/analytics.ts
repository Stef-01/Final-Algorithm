import { track as vercelTrack } from '@vercel/analytics';
import { Platform } from 'react-native';

// High-value behavioural events only (PRD §48), sent as Vercel Web Analytics custom events on the
// web build. Properties are short, non-sensitive values — never what the patient typed or said
// (PRD §45). The native apps don't send anything yet.

type Profession = 'gp' | 'psychologist' | 'either';

export type Events = {
  matching_started: { profession: Profession; demo: boolean; claude?: boolean };
  voice_started: Record<string, never>;
  voice_completed: { words: number };
  text_submitted: { words: number };
  followup_asked: { question: string; number: number };
  followup_answered: { question: string; ownWords: boolean };
  matching_completed: { matches: number; followups: number; seconds: number; profession: Profession };
  clinician_viewed: { clinician: string; fit: string };
  next_match_viewed: { position: number };
  booking_clicked: { clinician: string };
  match_feedback_positive: { clinician: string };
  match_feedback_negative: { clinician: string };
  /** PRD §49 primary metric: "How well do these clinicians seem to fit what you told us?" (1–5). */
  match_rating: { rating: number; matches: number };
  /** The floating assistant: opened, and each message (whether a chip, and whether it changed the list). */
  assistant_opened: { hasResults: boolean };
  assistant_message: { chip: boolean; changed: boolean; claude?: boolean };
};

export type EventName = keyof Events;

type Sender = (name: string, props: Record<string, string | number | boolean>) => void;

let sender: Sender | null = Platform.OS === 'web' ? (name, props) => vercelTrack(name, props) : null;

/** For tests: replace where events go. */
export function setAnalyticsSender(s: Sender | null) {
  sender = s;
}

const MAX_STRING = 48;

export function track<E extends EventName>(name: E, props: Events[E]) {
  if (!sender) return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props as Record<string, unknown>)) {
    if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
    // Only short identifiers (question ids, clinician ids, fit labels) — nothing a patient wrote.
    else if (typeof v === 'string' && v.length <= MAX_STRING && /^[\w\- ]+$/.test(v)) clean[k] = v;
  }
  try {
    sender(name, clean);
  } catch {
    // Analytics must never break the flow.
  }
}

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
