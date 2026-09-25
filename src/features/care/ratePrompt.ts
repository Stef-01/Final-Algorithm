import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE } from '@/features/match/remoteExtract';

// Now and then, when you open My care, WATL asks how it's going with one person on your team.
// At most one ask per visit, a 40% chance, and never the same person twice within two weeks.
// Ratings are anonymous and private: they help rank people for others, and nobody else sees them.

const KEY = 'watl_rate_asked';
export const CHANCE = 0.4;
const GAP_DAYS = 14;

export type Asked = Record<string, string>; // clinicianId → day last asked

/** The dice for "now and then" (replaced in tests so screens are predictable). */
export const promptRoll = () => Math.random();

/** Who to ask about this visit, or null. `roll` is a number in [0, 1). */
export function pickPrompt(team: string[], asked: Asked, roll: number, today = new Date()): string | null {
  const due = team.filter((id) => !asked[id] || (today.getTime() - new Date(asked[id]).getTime()) / 86_400_000 >= GAP_DAYS);
  if (!due.length || roll >= CHANCE) return null;
  return due[Math.min(due.length - 1, Math.floor((roll / CHANCE) * due.length))];
}

export async function loadAsked(): Promise<Asked> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Asked) : {};
  } catch {
    return {};
  }
}

export async function markAsked(id: string, asked: Asked, today = new Date()) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...asked, [id]: today.toISOString().slice(0, 10) })).catch(() => {});
}

/** Fire and forget, like the match rating. */
export function sendPractitionerRating(clinicianId: string, stars: number, note: string) {
  if (API_BASE === null || typeof fetch !== 'function') return;
  fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'practitioner', clinicianId, stars, ...(note.trim() ? { note: note.trim() } : {}) }),
  }).catch(() => {});
}
