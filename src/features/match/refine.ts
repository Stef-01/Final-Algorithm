import { areaPhrase } from '@server/engine/explain';
import type { Dimension, PatientSignals, Profession } from '@server/engine/types';

import type { ReplyFacts } from '@server/claude/reply';
import type { Extraction } from '@server/claude/types';

import { extractSignals, placeIn, withKeywordExtras } from './extract';

// The refine assistant (the floating button): after results are showing, the patient can say what
// to change ("online only", "someone more direct", "cost doesn't matter") and the list re-ranks.
// Refinements are later turns, so they override what was said earlier. Stand-in for the Claude
// agent (docs/PLAN.md Phase 8), which will take over the wording but keep these rules.

/** `facts`: what a 'Done' reply says, so Claude can word it (never set on medical questions). */
export type ChatTurn = { from: 'agent' | 'you'; text: string; action?: 'see_matches'; facts?: ReplyFacts };

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

// Questions only a clinician should answer: medication, doses, diagnosis, "is this normal". The
// assistant says so and offers to find someone, rather than guessing or ignoring the question.
const ADVICE = [
  /\bshould i (take|stop|start|increase|up|double|lower|reduce|change|switch|come off|try|be worried|worry|go to)\b/,
  /\b(dose|dosage|dosing|\d+ ?mg|milligrams?)\b/,
  /\bwhat (medication|medicine|meds|drug|dose|treatment|supplement)s?\b/,
  /\b(is|are) (it|this|that|these|my)( \w+){0,2} (normal|safe|serious|dangerous|ok to|okay to)\b/,
  /\bif (this|it|that) (is|means|could be) (adhd|autism|depression|anxiety|bipolar|ocd|ptsd)\b/,
  /\b(do i|could i|might i) (have|be) (adhd|autism|autistic|anxiety|depression|depressed|bipolar|ocd|ptsd|\w+ disorder)\b/,
  /\bam i (autistic|depressed|bipolar|adhd)\b/,
  /\bside[- ]effects?\b|\binteract(ion)?s? with\b|\bwithdrawal\b/,
  /\bhow (do|can|should) i (treat|cure|fix|manage|stop) (my|this|it)\b/,
  /\bdiagnose me\b|\bwhat('?s| is) wrong with me\b/,
  /\b(prescribe|recommend (a |an |some )?(medication|medicine|meds|drug|dose|supplement))/,
];

/** A question for a clinician rather than a change to the search. */
export const isAdviceRequest = (text: string) => ADVICE.some((re) => re.test(text.toLowerCase()));

/**
 * What's left of a message once its medical questions are taken out ("Should I up my dose? Also
 * online only" → "Also online only"). In a medical question a condition is the topic, not a request
 * to search for it.
 */
export const withoutAdvice = (text: string) =>
  (text.match(/[^.?!:]+[.?!:]*/g) ?? [])
    .filter((sentence) => !sentence.trim().endsWith('?') && !isAdviceRequest(sentence))
    .join(' ')
    .trim();

export const ADVICE_REPLY =
  "I can't give medical advice, but a clinician can talk that through with you properly. I can help you find one who fits. Tell me what matters to you, or pick a suggestion below.";

/** Asking for someone nearer, with or without saying where. */
export const CLOSER = /\b(closer|nearer|near me|close by|nearby|not so far|less travel)\b/;

/** "Actually, a GP instead" and similar. */
export function professionSwitch(text: string): Profession | undefined {
  const t = text.toLowerCase();
  if (!/\b(switch|change|instead|rather|actually|try|show)\b/.test(t)) return undefined;
  const words: [RegExp, Profession][] = [
    [/psycholog/, 'psychologist'],
    [/\bgps?\b|doctor/, 'gp'],
    [/\bcoach/, 'adhd_coach'],
    [/occupational|\bots?\b/, 'occupational_therapist'],
    [/physio(?!log)/, 'physiotherapist'],
    [/exercise physiolog/, 'exercise_physiologist'],
    [/neurotherap|neurofeedback|brain mapping/, 'neurotherapist'],
  ];
  return words.find(([re]) => re.test(t))?.[1];
}

/** Apply one refinement on top of everything said so far. Newer wins. */
export function applyRefinement(s: PatientSignals, text: string, claude?: Extraction): PatientSignals {
  const t = text.toLowerCase();
  const keyword = extractSignals(t);
  const x = claude ? withKeywordExtras(claude.signals, keyword) : keyword;
  if (!claude) {
    // "Less blunt" / "not so direct" mean gentler, not more direct.
    if (/(less|not so|not too|too) (direct|blunt|straight)/.test(t)) x.preferences.communication_directness = { value: 'gentle', confidence: 'medium' };
    if (/(less|not so|too) gentle|more direct/.test(t)) x.preferences.communication_directness = { value: 'direct', confidence: 'medium' };
  }
  const needs = [...s.clinicalNeeds];
  for (const n of x.clinicalNeeds) if (!needs.some((m) => m.area === n.area)) needs.push(n);
  const { dropGender: kwGender, dropDistance: kwDistance, ...relax } = claude ? {} : relaxations(t);
  const dropGender = kwGender || claude?.relax.dropGender;
  const dropDistance = kwDistance || claude?.relax.dropDistance;
  const constraints = { ...s.constraints, ...x.constraints, ...relax };
  // In a refinement any place counts ("somewhere in Southport"), not only "near …".
  const place = placeIn(t);
  if (place && !x.constraints.origin) {
    constraints.origin = place.origin;
    constraints.originLabel = place.label;
    constraints.maxKm = /walking|very close/.test(t) ? 5 : 15;
  }
  // "Closer" with a place already known: halve the distance (never under 3 km).
  if (!place && CLOSER.test(t) && constraints.origin) constraints.maxKm = Math.max(3, Math.round((constraints.maxKm ?? 20) / 2));
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
  const moved = a.origin && (a.origin.lat !== b.origin?.lat || a.origin.lng !== b.origin?.lng);
  if (moved) out.push(`within ${a.maxKm ?? 15} km of ${a.originLabel ?? 'where you said'}`);
  else if (a.maxKm !== b.maxKm) out.push(a.maxKm === undefined ? 'any distance' : `within ${a.maxKm} km${a.originLabel ? ` of ${a.originLabel}` : ''}`);
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
  const common = ['Online only', 'In person', 'Closer to me', 'Bulk billed only', 'Cost doesn’t matter', 'Someone more direct', 'Someone gentler', 'Longer appointments'];
  if (profession === 'psychologist') return [...common, 'Practical strategies', 'Neurodiversity-affirming', 'Show GPs instead'];
  if (profession === 'gp') return [...common, 'Mental health too', 'Weekend appointments', 'Show psychologists instead'];
  if (profession === 'adhd_coach') return ['Online only', 'In person', 'Closer to me', 'Neurodiversity-affirming', 'Show psychologists instead'];
  if (profession) return ['In person', 'Closer to me', 'Cost doesn’t matter', 'Show GPs instead'];
  return [...common, 'Weekend appointments'];
}

/** Chip wording → the words the extractor understands. */
export const SUGGESTION_TEXT: Record<string, string> = {
  'Online only': 'online only',
  'In person': 'face to face',
  'Closer to me': 'closer',
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
