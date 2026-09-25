import { NOT_SURE, QUESTIONS, type BankQuestion } from '../questions';
import { eligibleSet } from './eligibility';
import { IMPORTANCE, rank } from './score';
import { CONFIDENCE, type ClinicianRecord, type HardConstraints, type PatientSignals } from './types';

// Question selection (PRD §11–12, §20). A question is worth asking only if its answer
// could change the top 3; the score is expected ranking change × importance × uncertainty.

export const TOP_K = 3;

/** Below this expected gain, stop asking (PRD §12). Tuned on the seed data so the PRD §52 demo stops after one question. */
export const STOP_THRESHOLD = 0.1;

/** Default follow-up ceiling (PRD §4.4). */
export const MAX_QUESTIONS = 3;

const CONSTRAINT_IMPORTANCE: Partial<Record<keyof HardConstraints, number>> = {
  maxGap: 1,
  mode: 0.9,
  needsWeekend: 0.8,
};

export function topK(cs: ClinicianRecord[], s: PatientSignals, k = TOP_K) {
  return rank(eligibleSet(cs, s.constraints), s)
    .filter((x) => x.fit !== null)
    .slice(0, k)
    .map((x) => x.clinicianId);
}

/** 0 = same top 3 in the same order; 1 = completely different. Membership matters most. */
export function rankingChange(a: string[], b: string[]) {
  const size = Math.max(a.length, b.length, 1);
  const shared = a.filter((id) => b.includes(id)).length;
  const membership = (size - shared) / size;
  const order = a.some((id, i) => b[i] !== id) ? 1 : 0;
  return 0.8 * membership + 0.2 * order;
}

export function uncertainty(q: BankQuestion, s: PatientSignals) {
  if (q.target.kind === 'constraint') return s.constraints[q.target.key] === undefined ? 1 : 0;
  const p = s.preferences[q.target.dimension];
  if (!p) return 1;
  return p.confidence === 'high' ? 0 : 1 - CONFIDENCE[p.confidence];
}

export function importance(q: BankQuestion) {
  return q.target.kind === 'constraint' ? (CONSTRAINT_IMPORTANCE[q.target.key] ?? 0.5) : IMPORTANCE[q.target.dimension];
}

/** Information Gain Score for one question (PRD §12). "Not sure" is excluded; answers use their priors. */
export function informationGain(q: BankQuestion, s: PatientSignals, cs: ClinicianRecord[]) {
  const u = uncertainty(q, s);
  if (u === 0) return 0;
  const before = topK(cs, s);
  const answers = q.options.filter((o) => o.label !== NOT_SURE && o.apply);
  if (answers.length === 0) return 0;
  const priors = answers.map((o) => o.prior ?? 1 / answers.length);
  const total = priors.reduce((a, b) => a + b, 0);
  const expected = answers.reduce(
    (sum, o, i) => sum + (priors[i] / total) * rankingChange(before, topK(cs, o.apply!(s))),
    0,
  );
  return expected * importance(q) * u;
}

export type ScoredQuestion = { question: BankQuestion; gain: number };

export function scoreQuestions(s: PatientSignals, cs: ClinicianRecord[], asked: string[]): ScoredQuestion[] {
  return QUESTIONS.filter((q) => !asked.includes(q.id))
    .map((question) => ({ question, gain: informationGain(question, s, cs) }))
    .sort((a, b) => b.gain - a.gain || a.question.id.localeCompare(b.question.id));
}
