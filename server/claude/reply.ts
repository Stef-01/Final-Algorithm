import type Anthropic from '@anthropic-ai/sdk';

import { copyProblems } from '../engine/explain';

// Claude words the assistant's reply (docs/PLAN.md D9), from facts the engine already worked out.
// It can't add facts: a reply must name the right count and first clinician, follow the copy rules
// and contain nothing that reads as medical advice, or the app keeps its template.
// Medical questions never come here; they get a fixed reply on the device.

export const MODEL = 'claude-opus-5';

export type ReplyFacts = {
  /** What the patient asked for, as they wrote it. */
  said: string;
  /** What changed, in plain words ("online sessions only", "straight talking"). */
  changes: string[];
  /** e.g. "psychologists instead" when the patient switched profession. */
  switched?: string;
  count: number;
  /** "GP" / "GPs", "psychologist" / "psychologists". */
  noun: string;
  first: string;
};

/** Anything that reads as a dose, an instruction about treatment, or a diagnosis. */
export const ADVICE_IN_REPLY =
  /\d+ ?mg|you should (take|stop|start|increase|lower)|(try|take) (some|a|more)|you (probably|might|may|could) have|sounds like (you have|adhd|autism|depression)|it'?s (normal|safe|fine) to|medicat|diagnos|dose/i;

/** Ranking talk the list can't back up. Stricter than the profile copy rules, since replies are free text. */
const PRAISE = /\b(best|perfect|ideal|top|number one|great|amazing|excellent|wonderful|brilliant|fantastic)\b/i;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply'],
  properties: { reply: { type: 'string' } },
} as const;

const SYSTEM = `You write one short reply (one or two sentences, under 45 words) for WATL, an app that helps people find health professionals who fit them. The patient just asked to change their list of matches, and the app has already re-ranked it.

Say what changed and how many now fit, and name who's first, using exactly the facts given. Plain, friendly, Australian English; no exclamation marks, no emoji. Don't add facts, don't describe clinicians, don't praise anyone ("best", "perfect", "caring", "warm" and similar are not allowed), and never give medical advice or mention medication, doses or diagnoses.`;

/** A reply is usable only if it keeps the facts and follows the rules. */
export function checkReply(reply: string, f: ReplyFacts): string | null {
  const r = reply.trim().replace(/\s+/g, ' ');
  if (!r || r.length > 280) return null;
  if (!r.includes(String(f.count)) || !r.includes(f.first)) return null;
  if (ADVICE_IN_REPLY.test(r) || PRAISE.test(r) || copyProblems(r).length > 0 || /!|https?:/.test(r)) return null;
  return r;
}

export async function writeReply(client: Anthropic, f: ReplyFacts): Promise<string | null> {
  const facts = [
    `The patient said: ${f.said.slice(0, 500)}`,
    f.switched ? `They switched to: ${f.switched}` : null,
    f.changes.length ? `What changed: ${f.changes.join('; ')}` : null,
    `Now ${f.count} ${f.noun} fit. First on the list: ${f.first}.`,
  ]
    .filter(Boolean)
    .join('\n');
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 1000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: facts }],
  });
  if (response.stop_reason !== 'end_turn') return null;
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') return null;
  try {
    return checkReply((JSON.parse(block.text) as { reply: string }).reply, f);
  } catch {
    return null;
  }
}
