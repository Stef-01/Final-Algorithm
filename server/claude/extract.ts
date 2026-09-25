import type Anthropic from '@anthropic-ai/sdk';

import { professionals } from '../data/professionals';
import type { Extraction } from './types';
import { DIMENSIONS, type Confidence, type Dimension, type PatientSignals, type Profession } from '../engine/types';

// Claude extraction (docs/PLAN.md Phase 8): what the patient wrote → PatientSignals, via structured
// outputs. Claude only reads; the engine still does all the ranking, so every match stays explained
// by reviewed evidence. Everything Claude returns is validated again here: unknown areas, dimensions
// or values are dropped, and quotes must appear word for word in what the patient wrote.
// Relative imports only: this file is bundled into a Vercel Function.

export const MODEL = 'claude-opus-5';
/** Longest message we'll send, so one request can't run up the bill. */
export const MAX_CHARS = 2000;

/** The areas clinicians list, so needs always name something the engine can match. */
export const AREAS = [...new Set(professionals.flatMap((c) => c.expertise.map((e) => e.area)))].sort();
const DIMS = Object.keys(DIMENSIONS) as Dimension[];
const CONF = ['low', 'medium', 'high'] as const;


const str = { type: 'string' } as const;
const enumOf = (values: readonly string[]) => ({ type: 'string', enum: [...values] }) as const;

/** Structured-output schema. Every field required; "unset" and 0 mean "not mentioned". */
export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['needs', 'preferences', 'mode', 'cost', 'max_gap_dollars', 'weekend', 'clinician_gender', 'distance', 'age', 'urgent', 'urgent_reason'],
  properties: {
    needs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['area', 'confidence', 'quote'],
        properties: { area: enumOf(AREAS), confidence: enumOf(CONF), quote: str },
      },
    },
    preferences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dimension', 'value', 'confidence', 'quote'],
        properties: { dimension: enumOf(DIMS), value: str, confidence: enumOf(CONF), quote: str },
      },
    },
    mode: enumOf(['unset', 'any', 'in_person_only', 'telehealth_only']),
    cost: enumOf(['unset', 'bulk_billed_only', 'budget', 'no_concern']),
    max_gap_dollars: { type: 'integer' },
    weekend: enumOf(['unset', 'needs_weekend', 'weekdays_fine']),
    clinician_gender: enumOf(['unset', 'female', 'male', 'any']),
    distance: enumOf(['unset', 'happy_to_travel']),
    age: { type: 'integer' },
    urgent: { type: 'boolean' },
    urgent_reason: str,
  },
} as const;

const scale = DIMS.map((d) => `- ${d}: ${DIMENSIONS[d].join(' | ')}`).join('\n');

export const SYSTEM = `You read what a patient wrote while looking for a health professional (a GP, psychologist, ADHD coach, occupational therapist, physiotherapist, exercise physiologist or neurotherapy practitioner), and record what they asked for, for a matching engine. You never diagnose, advise or recommend anyone.

Record only what the patient actually said or clearly meant. If something isn't mentioned, leave it "unset" (or 0 for numbers, an empty list for needs and preferences). Being too cautious is fine; inventing a need or preference is not.

needs: health areas they want help with, using only these names: ${AREAS.join('; ')}. Mentioning ADHD or autism also means "Neurodivergent adults". A negated mention ("it's not anxiety") is not a need.

preferences: how they want care to feel, one entry per dimension, with a value from its scale:
${scale}
For example, feeling rushed → consultation_pace "unhurried"; wanting someone blunt → communication_directness "direct"; wanting practical tools → therapy_style "practical"; wanting to be accepted rather than fixed → neurodiversity_affirming "high".

Confidence: "high" when they said it outright, "medium" when it's a fair reading, "low" when it's a guess (prefer leaving it out).

quote: the patient's own words that support each entry, copied exactly (a short phrase, under 15 words).

Requirements:
- mode: "telehealth_only" only for online-only; "in_person_only" only for face-to-face only; "any" if they say either is fine.
- cost: "bulk_billed_only" (no out-of-pocket cost), "budget" with max_gap_dollars (a dollar limit they gave), or "no_concern" if they say cost doesn't matter.
- clinician_gender: only if they explicitly ask for a female or male clinician; "any" if they say it doesn't matter. Their own gender is not a preference.
- age: their age if they give it, else 0.
- urgent: true for anything that may need emergency care now (chest pain, thoughts of suicide or self-harm, overdose, can't breathe), with a short reason.

Later messages may be refinements to an existing search ("online only", "someone gentler"); record them the same way.`;

type Raw = {
  needs: { area: string; confidence: string; quote: string }[];
  preferences: { dimension: string; value: string; confidence: string; quote: string }[];
  mode: string;
  cost: string;
  max_gap_dollars: number;
  weekend: string;
  clinician_gender: string;
  distance: string;
  age: number;
  urgent: boolean;
  urgent_reason: string;
};

const conf = (c: string): Confidence => ((CONF as readonly string[]).includes(c) ? (c as Confidence) : 'low');
/** Keep a quote only if it's really in what the patient wrote. */
const verbatim = (quote: string, text: string) => {
  const q = quote.trim();
  return q && q.length <= 120 && text.toLowerCase().includes(q.toLowerCase()) ? q : undefined;
};

/** Validate Claude's output against the engine's vocabulary. Pure; tested without the API. */
export function toExtraction(raw: Raw, text: string, profession?: Profession): Extraction {
  const clinicalNeeds: PatientSignals['clinicalNeeds'] = [];
  for (const n of raw.needs ?? []) {
    if (!AREAS.includes(n.area) || clinicalNeeds.some((m) => m.area === n.area)) continue;
    clinicalNeeds.push({ area: n.area, confidence: conf(n.confidence), quote: verbatim(n.quote, text) });
  }
  const preferences: PatientSignals['preferences'] = {};
  for (const p of raw.preferences ?? []) {
    const d = p.dimension as Dimension;
    if (!DIMS.includes(d) || preferences[d] || !(DIMENSIONS[d] as readonly string[]).includes(p.value)) continue;
    preferences[d] = { value: p.value, confidence: conf(p.confidence), quote: verbatim(p.quote, text) };
  }
  const constraints: PatientSignals['constraints'] = {};
  if (raw.mode === 'any' || raw.mode === 'in_person_only' || raw.mode === 'telehealth_only') constraints.mode = raw.mode;
  if (raw.cost === 'bulk_billed_only') constraints.maxGap = 0;
  else if (raw.cost === 'no_concern') constraints.maxGap = null;
  else if (raw.cost === 'budget' && Number.isInteger(raw.max_gap_dollars) && raw.max_gap_dollars > 0 && raw.max_gap_dollars < 2000)
    constraints.maxGap = raw.max_gap_dollars;
  if (raw.weekend === 'needs_weekend') constraints.needsWeekend = true;
  if (raw.weekend === 'weekdays_fine') constraints.needsWeekend = false;
  if (raw.clinician_gender === 'female' || raw.clinician_gender === 'male') constraints.clinicianGender = raw.clinician_gender;
  if (Number.isInteger(raw.age) && raw.age >= 12 && raw.age <= 110) constraints.age = raw.age;

  const signals: PatientSignals = { profession, clinicalNeeds, preferences, constraints };
  if (raw.urgent) signals.safetyFlag = { level: 'urgent', reason: raw.urgent_reason.slice(0, 120) || 'urgent wording' };
  const high = clinicalNeeds.filter((n) => n.confidence === 'high').length;
  if (high >= 2) signals.complexity = high >= 4 ? 'complex' : 'multiple';
  return { signals, relax: { dropGender: raw.clinician_gender === 'any' || undefined, dropDistance: raw.distance === 'happy_to_travel' || undefined } };
}

export class ExtractionUnavailable extends Error {}

/** One patient message → validated signals. Throws ExtractionUnavailable when Claude can't answer. */
export async function extractWithClaude(client: Anthropic, text: string, profession?: Profession): Promise<Extraction> {
  const message = text.slice(0, MAX_CHARS);
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    // A simple reading task: low effort keeps it fast (PRD target: results in under 3 s).
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    // Opt in to server-side fallback if a safety classifier declines (routes by category).
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: `Looking for: ${profession?.replace(/_/g, ' ') ?? 'not sure yet (any kind of professional)'}\n\nThe patient wrote:\n${message}` }],
  });
  if (response.stop_reason !== 'end_turn') throw new ExtractionUnavailable(`stop_reason ${response.stop_reason}`);
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new ExtractionUnavailable('no text');
  let raw: Raw;
  try {
    raw = JSON.parse(block.text);
  } catch {
    throw new ExtractionUnavailable('invalid JSON');
  }
  return toExtraction(raw, message, profession);
}
