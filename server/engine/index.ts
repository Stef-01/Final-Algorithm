import type { BankQuestion } from '../questions';
import { selectTop } from './diversity';
import { eligibleSet } from './eligibility';
import { reasonsFor } from './explain';
import { MAX_QUESTIONS, scoreQuestions, STOP_THRESHOLD, topK } from './infoGain';
import { IMPORTANCE, rank, strongestLayer } from './score';
import type {
  ClinicianRecord,
  Dimension,
  EngineMatch,
  NoMatchAction,
  PatientSignals,
  Recommendation,
  Scored,
} from './types';

export * from './types';

// Agent decision policy (PRD §11): after each patient turn, choose exactly one next step.

export type Decision =
  | { type: 'safety' }
  | { type: 'ask'; question: BankQuestion; gain: number }
  | { type: 'confirm'; dimensions: Dimension[] }
  | { type: 'match' };

export type TurnState = { asked: string[]; preferencesConfirmed: boolean };

/** Absolute cap, even with the §4.4 exceptions. */
const HARD_CAP = MAX_QUESTIONS + 1;

/**
 * PRD §18: confirm inferred preferences only when there are several, at least one is uncertain,
 * and getting that one wrong would change the top 3.
 */
export function preferencesToConfirm(s: PatientSignals, cs: ClinicianRecord[]): Dimension[] {
  const dims = Object.keys(s.preferences) as Dimension[];
  if (dims.length < 3) return [];
  const before = topK(cs, s);
  const risky = dims.some((d) => {
    if (s.preferences[d]!.confidence === 'high') return false;
    const { [d]: _dropped, ...rest } = s.preferences;
    const after = topK(cs, { ...s, preferences: rest });
    return after.join() !== before.join();
  });
  if (!risky) return [];
  return dims.sort((a, b) => IMPORTANCE[b] - IMPORTANCE[a]).slice(0, 5);
}

/** A credible match is one we could actually show: eligible, above the fit threshold, and explainable. */
export function hasCredibleMatch(s: PatientSignals, cs: ClinicianRecord[]) {
  const byId = new Map(cs.map((c) => [c.id, c]));
  return selectTop(rank(eligibleSet(cs, s.constraints), s)).some((x) => reasonsFor(byId.get(x.clinicianId)!, s).length > 0);
}

export function decide(s: PatientSignals, cs: ClinicianRecord[], t: TurnState): Decision {
  if (s.safetyFlag?.level === 'urgent') return { type: 'safety' };

  const credible = hasCredibleMatch(s, cs);
  const [best] = scoreQuestions(s, cs, t.asked);
  const n = t.asked.length;
  if (best && best.gain >= STOP_THRESHOLD && n < HARD_CAP) {
    // A 4th question only for an unresolved hard constraint or when nothing credible fits yet (PRD §4.4).
    const exception = best.question.target.kind === 'constraint' || !credible;
    if (n < MAX_QUESTIONS || exception) return { type: 'ask', question: best.question, gain: best.gain };
  }

  if (!t.preferencesConfirmed) {
    const dimensions = preferencesToConfirm(s, cs);
    if (dimensions.length > 0) return { type: 'confirm', dimensions };
  }
  return { type: 'match' };
}

function toMatch(c: ClinicianRecord, x: Scored, s: PatientSignals): EngineMatch | null {
  const reasons = reasonsFor(c, s);
  // Never show a clinician we can't explain (PRD §4.8).
  if (reasons.length === 0 || !x.fit) return null;
  return { clinicianId: c.id, fit: x.fit, reasons, strongestLayer: strongestLayer(x) };
}

/** What would help when nothing fits (PRD §42): relax one constraint at a time and see if matches appear. */
function noMatchActions(s: PatientSignals, cs: ClinicianRecord[], asked: string[]): NoMatchAction[] {
  const k = s.constraints;
  const actions: NoMatchAction[] = [];
  if (k.mode === 'in_person_only' && hasCredibleMatch({ ...s, constraints: { ...k, mode: 'any' } }, cs)) {
    actions.push('include_telehealth');
  }
  if (k.maxKm !== undefined && hasCredibleMatch({ ...s, constraints: { ...k, maxKm: undefined } }, cs)) {
    actions.push('expand_distance');
  }
  if (scoreQuestions(s, cs, asked).some((q) => q.gain > 0)) actions.push('answer_more');
  return actions;
}

export function recommend(s: PatientSignals, cs: ClinicianRecord[], asked: string[] = []): Recommendation {
  const byId = new Map(cs.map((c) => [c.id, c]));
  const ranked = rank(eligibleSet(cs, s.constraints), s);

  const matches: EngineMatch[] = [];
  const shown = new Set<string>();
  for (const x of selectTop(ranked)) {
    const m = toMatch(byId.get(x.clinicianId)!, x, s);
    if (m) matches.push(m);
    shown.add(x.clinicianId);
  }
  if (matches.length === 0) return { status: 'none', actions: noMatchActions(s, cs, asked) };

  const more = ranked
    .filter((x) => !shown.has(x.clinicianId))
    .map((x) => toMatch(byId.get(x.clinicianId)!, x, s))
    .filter((m): m is EngineMatch => m !== null)
    .slice(0, 3);

  return { status: 'matches', matches, more };
}
