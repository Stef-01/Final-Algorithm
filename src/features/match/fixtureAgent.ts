import { clinicians, getClinician } from '@/data/clinicians';
import type { AgentStep, Clinician, FitLabel, Match, MatchResult, Question, Reason } from './types';

// Phase 1 stand-in for the matching engine (Phase 2) and the Claude agent (Phase 3).
// Deterministic keyword rules so every screen state can be reached and tested.
// Fixture triggers, for testers:
//   - the PRD demo text                  → one follow-up, then 3 matches
//   - "Not sure" as the answer           → preference confirmation screen
//   - "bulk bill" / "no gap"             → only 2 clinicians fit (partial results)
//   - "weekend" + "in person"            → no strong match; "Include telehealth" finds 1
//   - text with no care preferences      → no strong match; "Answer one more question"
//   - urgent wording (e.g. "chest pain") → safety pause

export type SessionInput = {
  texts: string[];
  answers: Record<string, string>;
  /** Priority labels the patient removed on the confirmation screen. */
  removedPriorities: string[];
  prioritiesConfirmed: boolean;
  includeTelehealth: boolean;
  safetyAcknowledged: boolean;
  wantsMoreQuestions: boolean;
};

export const DEMO_TEXT =
  "I've had GPs who technically know about ADHD, but appointments always feel rushed. I don't just want medication reviews. I want someone who can look at sleep, work stress and mental health too, and actually explain why they're recommending something.";

export const decisionQuestion: Question = {
  id: 'decision_style',
  ack: 'That helps — one thing would narrow this down.',
  text: 'When there are several reasonable options, what do you prefer?',
  options: ['Recommend the best one', 'Explain them and decide together', 'Let me decide after explaining', 'Not sure'],
};

export const rushedQuestion: Question = {
  id: 'rushed_detail',
  ack: 'Thanks — one more thing would help.',
  text: 'What usually makes an appointment feel rushed or unhelpful to you?',
  options: [],
};

const SAFETY_PATTERNS = [
  /chest pain/,
  /suicid/,
  /kill myself/,
  /self[- ]harm/,
  /overdos/,
  /can'?t breathe|cannot breathe/,
  /emergency/,
];

type Signal = 'pace' | 'holistic' | 'explain' | 'adhd' | 'decision';

const PRIORITY_LABELS: Record<Exclude<Signal, 'decision'>, string> = {
  adhd: 'ADHD experience',
  pace: 'Longer appointments',
  holistic: 'Sleep and mental health together',
  explain: 'Explains the reasons',
};

const allText = (input: SessionInput) =>
  [...input.texts, ...Object.values(input.answers)].join(' ').toLowerCase();

function decisionOf(input: SessionInput): 'together' | 'recommend' | 'self' | 'unsure' | undefined {
  const a = input.answers[decisionQuestion.id]?.toLowerCase();
  if (!a) return undefined;
  if (/together|talk|discuss/.test(a)) return 'together';
  if (/recommend|best one|tell me/.test(a)) return 'recommend';
  if (/let me decide|my own|choose/.test(a)) return 'self';
  return 'unsure';
}

function signalsOf(input: SessionInput): Signal[] {
  const t = allText(input);
  const found: Signal[] = [];
  if (/rush|hurried|quick|longer|more time/.test(t)) found.push('pace');
  if (/sleep|stress|mental health|anxiety|mood/.test(t)) found.push('holistic');
  if (/explain|why/.test(t)) found.push('explain');
  if (/adhd/.test(t)) found.push('adhd');
  const d = decisionOf(input);
  if (d && d !== 'unsure') found.push('decision');
  const removed = new Set(input.removedPriorities);
  return found.filter((s) => s === 'decision' || !removed.has(PRIORITY_LABELS[s]));
}

export function isUrgent(text: string) {
  const t = text.toLowerCase();
  return SAFETY_PATTERNS.some((p) => p.test(t));
}

/** PRD §11: after each patient turn, pick exactly one next step. */
export function nextStep(input: SessionInput): AgentStep {
  if (!input.safetyAcknowledged && isUrgent(allText(input))) return { type: 'safety' };
  if (input.wantsMoreQuestions && !input.answers[rushedQuestion.id]) return { type: 'ask', question: rushedQuestion };
  if (!input.answers[decisionQuestion.id]) return { type: 'ask', question: decisionQuestion };
  if (decisionOf(input) === 'unsure' && !input.prioritiesConfirmed) {
    const priorities = signalsOf(input)
      .filter((s): s is Exclude<Signal, 'decision'> => s !== 'decision')
      .map((s) => PRIORITY_LABELS[s]);
    if (priorities.length > 0) return { type: 'confirm', priorities };
  }
  return { type: 'match' };
}

const SIGNAL_TEXT: Record<Exclude<Signal, 'decision' | 'adhd'>, string> = {
  pace: "You said rushed appointments haven't worked for you.",
  holistic: 'You want sleep, work stress and mental health looked at together.',
  explain: "You want to know why something's being recommended.",
};

const DECISION_TEXT = {
  together: "You'd like to hear the options and decide together.",
  recommend: "You'd like a clear recommendation.",
  self: "You'd like to decide once the options are explained.",
} as const;

const DECISION_TRAIT = {
  together: 'shared_decision_making',
  recommend: 'communication_directness',
  self: 'patient_autonomy',
} as const;

const TRAITS: Record<Exclude<Signal, 'decision' | 'adhd'>, string[]> = {
  pace: ['consultation_pace'],
  holistic: ['mental_health_integration', 'clinical_expertise', 'care_coordination'],
  explain: ['explanation_depth'],
};

/** Up to 3 reasons, each pairing a patient signal with the clinician's evidence (PRD §27). */
function reasonsFor(clinician: Clinician, input: SessionInput): Reason[] {
  const signals = signalsOf(input);
  const decision = decisionOf(input);
  const wanted: { signal: string; traits: string[] }[] = [];
  for (const s of ['pace', 'holistic', 'decision', 'explain'] as const) {
    if (!signals.includes(s)) continue;
    if (s === 'decision') {
      if (decision && decision !== 'unsure') {
        wanted.push({ signal: DECISION_TEXT[decision], traits: [DECISION_TRAIT[decision]] });
      }
    } else {
      wanted.push({ signal: SIGNAL_TEXT[s], traits: TRAITS[s] });
    }
  }
  const reasons: Reason[] = [];
  for (const w of wanted) {
    const ev = clinician.evidence.find((e) => w.traits.includes(e.trait));
    if (ev) reasons.push({ signal: w.signal, evidenceId: ev.id, evidence: ev.patientFacing });
    if (reasons.length === 3) break;
  }
  return reasons;
}

const FIT: Record<string, FitLabel> = {
  'amy-chen': 'Strong fit',
  'priya-nair': 'Good fit',
  'tom-walsh': 'Good fit',
  'grace-okafor': 'Worth considering',
};

const ORDER = ['amy-chen', 'priya-nair', 'tom-walsh'];
const MORE = ['grace-okafor'];

function toMatch(id: string, input: SessionInput): Match | null {
  const c = getClinician(id);
  if (!c) return null;
  const reasons = reasonsFor(c, input);
  // Never show a clinician we can't explain (PRD §4.8, §42).
  return reasons.length > 0 ? { clinicianId: id, fit: FIT[id], reasons } : null;
}

/** Layer 1 eligibility for the constraints the fixture understands. */
function eligible(c: Clinician, input: SessionInput) {
  const t = allText(input);
  if (/bulk.?bill|no gap|can'?t afford/.test(t) && c.practical.gapAfterMedicare > 0) return false;
  if (/weekend|saturday|sunday/.test(t)) {
    if (!c.practical.weekends) return false;
    if (/in person/.test(t) && !input.includeTelehealth && !c.practical.modes.includes('In person')) return false;
  }
  return true;
}

export function runMatching(input: SessionInput): MatchResult {
  // One extra question at most; after that, don't keep asking (PRD §4.4).
  const canAskMore = !input.answers[rushedQuestion.id];
  if (signalsOf(input).length === 0) return { status: 'none', actions: canAskMore ? ['answer_more'] : [] };

  const t = allText(input);
  const weekendInPerson = /weekend|saturday|sunday/.test(t) && /in person/.test(t);
  const pool = weekendInPerson ? [...ORDER, ...MORE] : ORDER;
  const matches = pool
    .filter((id) => eligible(getClinician(id)!, input))
    .map((id) => toMatch(id, input))
    .filter((m): m is Match => m !== null)
    .slice(0, 3);

  if (matches.length === 0) {
    return {
      status: 'none',
      actions:
        weekendInPerson && !input.includeTelehealth ? ['include_telehealth'] : canAskMore ? ['answer_more'] : [],
    };
  }

  const shown = new Set(matches.map((m) => m.clinicianId));
  const more = clinicians
    .map((c) => c.id)
    .filter((id) => !shown.has(id) && MORE.includes(id) && eligible(getClinician(id)!, input))
    .map((id) => toMatch(id, input))
    .filter((m): m is Match => m !== null);

  return { status: 'matches', matches, more };
}
