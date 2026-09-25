import { professionals } from '@server/data/professionals';
import { decide, recommend } from '@server/engine';
import { scoreQuestions } from '@server/engine/infoGain';
import type { Extraction } from '@server/claude/types';
import type { Dimension, PatientSignals, Profession } from '@server/engine/types';
import { applyAnswer, NOT_SURE, questionById, type BankQuestion } from '@server/questions';

import { demoById } from './demos';
import { extractSignals, mergeSignals, withKeywordExtras } from './extract';
import { applyRefinement } from './refine';
import type { AgentStep, MatchResult, Priority, Question } from './types';

// The matching agent, running the real engine on the device. Patient text becomes signals via a
// demo script or the keyword extractor; the Claude extractor replaces that in the final phase.

export type SessionInput = {
  /** undefined = either profession. */
  profession?: Profession;
  demoId?: string;
  texts: string[];
  /** Question id → option label ("Not sure" when answered in the patient's own words). */
  answers: Record<string, string>;
  /** Preference dimensions the patient removed on the confirmation screen. */
  removedPriorities: string[];
  prioritiesConfirmed: boolean;
  includeTelehealth: boolean;
  expandDistance: boolean;
  safetyAcknowledged: boolean;
  wantsMoreQuestions: boolean;
  /** What the patient asked the refine assistant to change, oldest first. Newer wins. */
  refinements?: string[];
  /** Claude's reading of the opening description (Phase 8); absent = keyword extractor. */
  extracted?: Extraction;
  /** Claude's reading of each refinement, parallel to `refinements` (null = keyword extractor). */
  refinementExtracts?: (Extraction | null)[];
};

export const pool = professionals;

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function signalsFor(input: SessionInput): PatientSignals {
  const demo = input.demoId ? demoById(input.demoId) : undefined;
  const first = input.texts[0] ?? '';
  let s = demo
    ? clone(demo.signals)
    : input.extracted
      ? withKeywordExtras(clone(input.extracted.signals), extractSignals(first))
      : extractSignals(first);
  const later = input.texts.slice(1).join(' ');
  if (later) s = mergeSignals(s, extractSignals(later));
  s.profession = input.profession;
  for (const [q, a] of Object.entries(input.answers)) s = applyAnswer(s, q, a);
  for (const d of input.removedPriorities) delete s.preferences[d as Dimension];
  if (input.includeTelehealth && s.constraints.mode === 'in_person_only') s.constraints = { ...s.constraints, mode: 'any' };
  if (input.expandDistance) s.constraints = { ...s.constraints, maxKm: undefined };
  (input.refinements ?? []).forEach((r, i) => {
    s = applyRefinement(s, r, input.refinementExtracts?.[i] ?? undefined);
  });
  s.profession = input.profession;
  if (input.safetyAcknowledged) delete s.safetyFlag;
  return s;
}

const asked = (input: SessionInput) => Object.keys(input.answers);

function toQuestion(q: BankQuestion, input: SessionInput): Question {
  const first = asked(input).length === 0;
  const ack =
    q.target.kind === 'constraint'
      ? 'One practical thing to check.'
      : first
        ? 'That helps — one thing would narrow this down.'
        : 'Thanks — one more thing would help.';
  return { id: q.id, ack, text: q.text, options: q.options.map((o) => o.label) };
}

export const PRIORITY_LABEL: Partial<Record<Dimension, Record<string, string>>> = {
  consultation_pace: { unhurried: 'Longer appointments', brisk: 'Quick appointments', standard: 'Standard appointments' },
  explanation_depth: { detailed: 'Explains the reasons', brief: 'Just the key points' },
  mental_health_integration: { high: 'Mental health looked at too' },
  shared_decision_making: { shared: 'Deciding together', clinician_led: 'Clear recommendations', patient_led: 'You make the call' },
  communication_directness: { direct: 'Straight talking', gentle: 'A gentle approach' },
  diagnostic_style: { investigative: 'Looking into things properly' },
  medication_philosophy: { conservative: 'Not only medication' },
  lifestyle_integration: { high: 'Sleep and lifestyle in the plan' },
  therapy_style: { practical: 'Practical strategies', exploratory: 'Knowing the why', balanced: 'Strategies and insight' },
  neurodiversity_affirming: { high: 'Neurodiversity-affirming' },
  care_coordination: { high: 'Works with your other supports' },
  continuity: { high: 'Seeing the same person' },
  follow_up_intensity: { scheduled: 'Regular check-ins', proactive: 'Active follow-up' },
};

export const priorityLabel = (d: Dimension, v: string) => PRIORITY_LABEL[d]?.[v];

export function priorities(s: PatientSignals, dims: Dimension[]): Priority[] {
  const out: Priority[] = [];
  for (const d of dims) {
    const label = PRIORITY_LABEL[d]?.[s.preferences[d]?.value ?? ''];
    if (label) out.push({ dimension: d, label });
  }
  return out;
}

/** PRD §11: after each patient turn, exactly one next step. */
export function nextStep(input: SessionInput): AgentStep {
  const s = signalsFor(input);
  if (s.safetyFlag?.level === 'urgent') return { type: 'safety' };
  if (input.wantsMoreQuestions) {
    const q = scoreQuestions(s, pool, asked(input)).find((x) => x.gain > 0);
    if (q) return { type: 'ask', question: toQuestion(q.question, input) };
  }
  const d = decide(s, pool, { asked: asked(input), preferencesConfirmed: input.prioritiesConfirmed });
  switch (d.type) {
    case 'safety':
      return { type: 'safety' };
    case 'ask':
      return { type: 'ask', question: toQuestion(d.question, input) };
    case 'confirm': {
      const p = priorities(s, d.dimensions);
      return p.length > 0 ? { type: 'confirm', priorities: p } : { type: 'match' };
    }
    case 'match':
      return { type: 'match' };
  }
}

export function runMatching(input: SessionInput): MatchResult {
  const r = recommend(signalsFor(input), pool, asked(input));
  if (r.status === 'none') return r;
  const strip = (m: (typeof r.matches)[number]) => ({
    clinicianId: m.clinicianId,
    fit: m.fit,
    reasons: m.reasons.map(({ signal, evidenceId, evidence }) => ({ signal, evidenceId, evidence })),
    caveats: m.caveats,
  });
  return { status: 'matches', matches: r.matches.map(strip), more: r.more.map(strip) };
}

/** Map an answer to an option label; anything else is the patient's own words. */
export function normaliseAnswer(questionId: string, value: string): { label: string; ownWords?: string } {
  const q = questionById(questionId);
  const opt = q?.options.find((o) => o.label.toLowerCase() === value.trim().toLowerCase());
  return opt ? { label: opt.label } : { label: NOT_SURE, ownWords: value.trim() };
}

export const bankQuestion = (id?: string) => (id ? questionById(id) : undefined);
