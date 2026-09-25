import { Platform } from 'react-native';

import type { ReplyFacts } from '@server/claude/reply';
import type { Extraction } from '@server/claude/types';
import type { Profession } from '@server/engine/types';

// Client for the Claude extractor (api/extract.ts). Any failure — offline, no API key configured,
// slow, refused — returns null and the app uses its keyword extractor instead, so a search never
// waits on or breaks because of the model.

/** Web calls its own origin; native builds need EXPO_PUBLIC_API_URL (e.g. https://final-algorithm.vercel.app). */
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '' : null);
const BASE = API_BASE;
export const TIMEOUT_MS = 6000;

let enabledCache: Promise<boolean> | null = null;

/** Whether Claude is switched on for this deployment (cached for the session). */
export function claudeEnabled(): Promise<boolean> {
  if (BASE === null || typeof fetch !== 'function') return Promise.resolve(false);
  enabledCache ??= fetch(`${BASE}/api/extract`)
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .then((b: { enabled?: boolean }) => b.enabled === true)
    .catch(() => false);
  return enabledCache;
}

const looksValid = (x: unknown): x is Extraction => {
  const s = (x as Extraction | null)?.signals;
  return !!s && Array.isArray(s.clinicalNeeds) && typeof s.preferences === 'object' && typeof s.constraints === 'object';
};

export async function extractRemote(text: string, profession?: Profession, timeoutMs = TIMEOUT_MS): Promise<Extraction | null> {
  if (!(await claudeEnabled())) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}/api/extract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, profession }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const body: unknown = await r.json();
    return looksValid(body) ? body : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** For tests: forget the cached "enabled" answer. */
export function resetClaudeCache() {
  enabledCache = null;
}

// ---- Claude-worded assistant replies (api/reply.ts), off unless WATL_CLAUDE_REPLIES=on ----

let replyCache: Promise<boolean> | null = null;

function replyEnabled(): Promise<boolean> {
  if (BASE === null || typeof fetch !== 'function') return Promise.resolve(false);
  replyCache ??= fetch(`${BASE}/api/reply`)
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .then((b: { enabled?: boolean }) => b.enabled === true)
    .catch(() => false);
  return replyCache;
}

/** Claude's wording of a reply's facts, or null to keep the template. */
export async function rewordRemote(facts: ReplyFacts, timeoutMs = 4000): Promise<string | null> {
  if (!(await replyEnabled())) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}/api/reply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ facts }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { reply?: unknown };
    return typeof body.reply === 'string' && body.reply.length <= 280 ? body.reply : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
