import { areaPhrase } from '@server/engine/explain';
import type { Dimension, PatientSignals, Profession } from '@server/engine/types';

import { extractSignals } from './extract';

// The refine assistant (the floating button): after results are showing, the patient can say what
// to change ("online only", "someone more direct", "cost doesn't matter") and the list re-ranks.
// Refinements are later turns, so they override what was said earlier. Stand-in for the Claude
// agent (docs/PLAN.md Phase 8), which will take over the wording but keep these rules.

export type ChatTurn = { from: 'agent' | 'you'; text: string; action?: 'see_matches' };

/** Loosening a requirement, which the keyword extractor alone can't express. */
function relaxations(t: string): Partial<PatientSignals['constraints']> & { dropGender?: boolean; dropDistance?: boolean } {
  const out: ReturnType<typeof relaxations> = {};
  if (/any (format|way)|either (way|is fine)|online or in[- ]person|in[- ]person or online|don'?t mind (online|telehealth|in[- ]person|how)/.test(t)) out.mode = 'any';
  if (/(cost|price|money|fee)s? (doesn'?t|does not|don'?t|do not) matter|(doesn'?t|don'?t|does not) (need|have) to be bulk|not bulk.?billed|happy to pay|any (cost|price)/.test(t))
    out.maxGap = null;
  if (/(no|don'?t need|not on|not) weekends?|weekdays? (are|is) fine/.test(t)) out.needsWeekend = false;
  if (/any gender|don'?t mind (the )?(gender|male or female|female or male)/.test(t)) out.dropGender = true;
  if (/further( away)?|any distance|don'?t mind (travel|driving)|happy to travel/.test(t)) out.dropDistance = true;
  return out;
}

/** "Actually, a GP instead" and similar. */
export function professionSwitch(text: string): Profession | undefined {
  const t = text.toLowerCase();
  if (!/\b(switch|change|instead|rather|actually|try|show)\b/.test(t)) return undefined;
  if (/psycholog/.test(t)) return 'psychologist';
  if (/\bgps?\b|doctor/.test(t)) return 'gp';
  return undefined;
}

/** Apply one refinement on top of everything said so far. Newer wins. */
export function applyRefinement(s: PatientSignals, text: string): PatientSignals {
  const t = text.toLowerCase();
  const x = extractSignals(t);
  // "Less blunt" / "not so direct" mean gentler, not more direct.
  if (/(less|not so|not too|too) (direct|blunt|straight)/.test(t)) x.preferences.communication_directness = { value: 'gentle', confidence: 'medium' };
  if (/(less|not so|too) gentle|more direct/.test(t)) x.preferences.communication_directness = { value: 'direct', confidence: 'medium' };
  const needs = [...s.clinicalNeeds];
  for (const n of x.clinicalNeeds) if (!needs.some((m) => m.area === n.area)) needs.push(n);
  const { dropGender, dropDistance, ...relax } = relaxations(t);
  const constraints = { ...s.constraints, ...x.constraints, ...relax };
  if (dropGender) delete constraints.clinicianGender;
  if (dropDistance) delete constraints.maxKm;
  // Asked for directly, so the patient means it: count these as confirmed.
  const prefs = Object.fromEntries(Object.entries(x.preferences).map(([d, p]) => [d, { ...p!, confidence: 'high' as const }]));
  return {
    ...s,
    clinicalNeeds: needs,
    preferences: { ...s.preferences, ...prefs },
    constraints,
    safetyFlag: s.safetyFlag ?? x.safetyFlag,
  };
}

const MODE: Record<string, string> = { telehealth_only: 'online sessions only', in_person_only: 'in-person only', any: 'online or in person' };

/** What actually changed between two sets of signals, in the patient's terms. Never claims a change that didn't happen. */
export function describeChange(before: PatientSignals, after: PatientSignals, label: (d: Dimension, v: string) => string | undefined): string[] {
  const out: string[] = [];
  const b = before.constraints;
  const a = after.constraints;
  if ((a.mode ?? 'any') !== (b.mode ?? 'any')) out.push(MODE[a.mode ?? 'any']);
  if (a.maxGap !== b.maxGap) out.push(a.maxGap === 0 ? 'bulk-billed only' : a.maxGap === null || a.maxGap === undefined ? 'any cost' : `up to $${a.maxGap} out of pocket`);
  if (!!a.needsWeekend !== !!b.needsWeekend) out.push(a.needsWeekend ? 'weekend appointments' : 'no weekend requirement');
  if (a.clinicianGender !== b.clinicianGender) out.push(a.clinicianGender ? `a ${a.clinicianGender} clinician` : 'any gender');
  if (a.maxKm !== b.maxKm) out.push(a.maxKm === undefined ? 'any distance' : `within ${a.maxKm} km`);
  for (const [d, p] of Object.entries(after.preferences)) {
    if (before.preferences[d as Dimension]?.value === p!.value) continue;
    const l = label(d as Dimension, p!.value);
    if (l) out.push(l.charAt(0).toLowerCase() + l.slice(1));
  }
  for (const n of after.clinicalNeeds) {
    if (!before.clinicalNeeds.some((m) => m.area === n.area) && n.confidence === 'high') out.push(`help with ${areaPhrase(n.area)}`);
  }
  return out;
}

const LOOSE: PatientSignals = { clinicalNeeds: [], preferences: {}, constraints: {} };
const STRICT: PatientSignals = {
  clinicalNeeds: [],
  preferences: {},
  constraints: { mode: 'telehealth_only', maxGap: 0, needsWeekend: true, clinicianGender: 'female', maxKm: 5 },
};

/** Whether a message asks for any change at all (even one that's already in effect). */
export function understood(text: string, label: (d: Dimension, v: string) => string | undefined): boolean {
  return [LOOSE, STRICT].some((base) => describeChange(base, applyRefinement(base, text), label).length > 0);
}

/** "a, b and c" */
export const listPhrase = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/** Suggestions shown as chips, worded as the patient would say them. */
export function refineSuggestions(profession?: Profession): string[] {
  const common = ['Online only', 'In person', 'Bulk billed only', 'Cost doesn’t matter', 'Someone more direct', 'Someone gentler', 'Longer appointments'];
  if (profession === 'psychologist') return [...common, 'Practical strategies', 'Neurodiversity-affirming', 'Show GPs instead'];
  if (profession === 'gp') return [...common, 'Mental health too', 'Weekend appointments', 'Show psychologists instead'];
  return [...common, 'Weekend appointments'];
}

/** Chip wording → the words the extractor understands. */
export const SUGGESTION_TEXT: Record<string, string> = {
  'Online only': 'online only',
  'In person': 'face to face',
  'Bulk billed only': 'bulk billed',
  'Cost doesn’t matter': "cost doesn't matter",
  'Someone more direct': 'more direct',
  'Someone gentler': 'less direct, gentle',
  'Longer appointments': 'longer appointments',
  'Practical strategies': 'practical strategies',
  'Neurodiversity-affirming': 'neurodiversity affirming',
  'Mental health too': 'look at my mental health as well',
  'Weekend appointments': 'weekend',
  'Show GPs instead': 'show GPs instead',
  'Show psychologists instead': 'show psychologists instead',
};
