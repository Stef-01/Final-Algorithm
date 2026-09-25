import { fixtureClinicians as cs } from '../server/fixtures/clinicians';
import { decide, preferencesToConfirm, recommend, type PatientSignals, type Scored } from '../server/engine';
import { NEAR_TIE, selectTop } from '../server/engine/diversity';
import { eligibleSet, failures } from '../server/engine/eligibility';
import { copyProblems, experiencedWith, practiceStyle, reasonsFor } from '../server/engine/explain';
import { MAX_QUESTIONS, scoreQuestions, STOP_THRESHOLD } from '../server/engine/infoGain';
import { rank, similarity, usableTrait } from '../server/engine/score';
import { CONFIDENCE, DIMENSIONS, type Dimension } from '../server/engine/types';
import {
  demoSignals,
  efficientSignals,
  investigateSignals,
  urgentSignals,
  vagueSignals,
} from '../server/fixtures/signals';
import { applyAnswer, NOT_SURE, QUESTIONS } from '../server/questions';

const byId = (id: string) => cs.find((c) => c.id === id)!;
const ids = (xs: { clinicianId: string }[]) => xs.map((x) => x.clinicianId);
const withConstraints = (s: PatientSignals, k: PatientSignals['constraints']): PatientSignals => ({
  ...s,
  constraints: { ...s.constraints, ...k },
});
const NEW_FARM = { lat: -27.4678, lng: 153.051 };
const demoAnswered = applyAnswer(demoSignals, 'decision_style', 'Explain them and decide together');
const fresh = { asked: [] as string[], preferencesConfirmed: false };

describe('seed data', () => {
  it('has 10–15 fictional clinicians with unique ids', () => {
    expect(cs.length).toBeGreaterThanOrEqual(10);
    expect(cs.length).toBeLessThanOrEqual(15);
    expect(new Set(ids(cs.map((c) => ({ clinicianId: c.id })))).size).toBe(cs.length);
  });

  it.each(cs.map((c) => [c.id, c]))('%s: every trait is traceable to evidence on a valid scale', (_id, c) => {
    const evidence = new Map(c.evidence.map((e) => [e.id, e]));
    for (const [d, t] of Object.entries(c.phenotype) as [Dimension, NonNullable<(typeof c.phenotype)[Dimension]>][]) {
      expect(DIMENSIONS[d] as readonly string[]).toContain(t.value);
      expect(t.evidenceIds.length).toBeGreaterThan(0);
      for (const id of t.evidenceIds) expect(evidence.get(id)?.trait).toBe(d);
    }
    for (const e of c.expertise) for (const id of e.evidenceIds) expect(evidence.get(id)?.trait).toBe('expertise');
    for (const e of c.evidence) {
      expect(e.excerpt.trim()).not.toBe('');
      expect(e.patientFacing.trim()).not.toBe('');
      expect(e.scenario.trim()).not.toBe('');
      expect(copyProblems(e.patientFacing)).toEqual([]);
    }
  });
});

describe('Layer 1: eligibility', () => {
  it('never assumes unknown constraints', () => {
    // Everyone taking new patients is eligible when we know nothing.
    expect(ids(eligibleSet(cs, {}).map((c) => ({ clinicianId: c.id })))).not.toContain('ella-brooks');
    expect(eligibleSet(cs, {})).toHaveLength(cs.filter((c) => c.practical.newPatients).length);
  });

  it('excludes clinicians not taking new patients', () => {
    expect(failures(byId('ella-brooks'), {})).toContain('new_patients');
  });

  it('respects age ranges only when age is known', () => {
    expect(failures(byId('oliver-smith'), { age: 27 })).toContain('age');
    expect(failures(byId('oliver-smith'), { age: 45 })).toEqual([]);
    expect(failures(byId('oliver-smith'), {})).toEqual([]);
  });

  it('filters by out-of-pocket cost; "cost isn\'t a concern" filters nothing', () => {
    expect(eligibleSet(cs, { maxGap: 0 }).every((c) => c.practical.gapAfterMedicare === 0)).toBe(true);
    expect(eligibleSet(cs, { maxGap: null })).toHaveLength(eligibleSet(cs, {}).length);
  });

  it('handles appointment mode and distance', () => {
    expect(failures(byId('grace-okafor'), { mode: 'in_person_only' })).toContain('mode');
    expect(failures(byId('hannah-lee'), { mode: 'telehealth_only' })).toContain('mode');
    const near = { origin: NEW_FARM, maxKm: 3 };
    expect(failures(byId('lucy-nguyen'), { ...near, mode: 'in_person_only' })).toContain('distance');
    // Telehealth keeps a distant clinician eligible when the patient is open to it.
    expect(failures(byId('lucy-nguyen'), { ...near, mode: 'any' })).toEqual([]);
    expect(failures(byId('ravi-singh'), { ...near, mode: 'any' })).toContain('distance');
  });

  it('applies explicit gender, weekend and language requests', () => {
    expect(failures(byId('tom-walsh'), { clinicianGender: 'female' })).toContain('gender');
    expect(failures(byId('amy-chen'), { needsWeekend: true })).toContain('weekend');
    expect(failures(byId('lucy-nguyen'), { languages: ['Vietnamese'] })).toEqual([]);
    expect(failures(byId('amy-chen'), { languages: ['Vietnamese'] })).toContain('language');
  });
});

describe('Layers 2–4: scoring', () => {
  it('ignores draft and low-confidence clinician traits (PRD §26)', () => {
    expect(byId('lucy-nguyen').phenotype.continuity).toBeDefined();
    expect(usableTrait(byId('lucy-nguyen'), 'continuity')).toBeUndefined(); // draft
    expect(usableTrait(byId('oliver-smith'), 'explanation_depth')).toBeUndefined(); // low confidence
    expect(usableTrait(byId('amy-chen'), 'consultation_pace')?.value).toBe('unhurried');
  });

  it('measures similarity along each ordered scale', () => {
    expect(similarity('consultation_pace', 'unhurried', 'unhurried')).toBe(1);
    expect(similarity('consultation_pace', 'unhurried', 'standard')).toBe(0.5);
    expect(similarity('consultation_pace', 'unhurried', 'brisk')).toBe(0);
  });

  it('ranks a clinician higher when their practice matches what the patient asked for', () => {
    const pos = (s: PatientSignals) => ids(rank(cs, s)).indexOf('daniel-reyes');
    expect(pos(efficientSignals)).toBe(0);
    expect(pos(demoSignals)).toBeGreaterThan(5);
  });

  it('gives the PRD demo patient Amy as a strong fit', () => {
    const [top] = rank(eligibleSet(cs, demoSignals.constraints), demoSignals);
    expect(top.clinicianId).toBe('amy-chen');
    expect(top.fit).toBe('Strong fit');
  });
});

describe('question selection (PRD §11–15, §20)', () => {
  it('asks exactly one follow-up for the PRD demo, then stops', () => {
    const first = decide(demoSignals, cs, fresh);
    expect(first.type === 'ask' && first.question.id).toBe('decision_style');
    expect(decide(demoAnswered, cs, { asked: ['decision_style'], preferencesConfirmed: false })).toEqual({ type: 'match' });
  });

  it("doesn't ask about things already known with confidence", () => {
    const gains = Object.fromEntries(scoreQuestions(demoSignals, cs, []).map((q) => [q.question.id, q.gain]));
    expect(gains.pace).toBe(0);
    expect(gains.explanation).toBe(0);
    expect(gains.mental_health).toBe(0);
  });

  it('only asks about cost when it could change the top 3', () => {
    const bulkBilledOnly = cs.filter((c) => c.practical.gapAfterMedicare === 0);
    const gain = (pool: typeof cs) =>
      scoreQuestions(demoAnswered, pool, []).find((q) => q.question.id === 'cost')!.gain;
    expect(gain(bulkBilledOnly)).toBe(0);
    expect(gain(cs)).toBeGreaterThan(0);
  });

  it('asks the highest-gain question when there is little to go on', () => {
    const d = decide(vagueSignals, cs, fresh);
    expect(d.type).toBe('ask');
    const [best] = scoreQuestions(vagueSignals, cs, []);
    expect(d.type === 'ask' && d.question.id).toBe(best.question.id);
    expect(best.gain).toBeGreaterThanOrEqual(STOP_THRESHOLD);
  });

  it('stops at 3 questions when a credible match exists and only preferences are left to ask', () => {
    const asked = ['q1', 'q2', 'q3'];
    const s = withConstraints(investigateSignals, { maxGap: null, mode: 'any', needsWeekend: false });
    const [best] = scoreQuestions(s, cs, asked);
    expect(best.question.target.kind).toBe('preference');
    expect(best.gain).toBeGreaterThanOrEqual(STOP_THRESHOLD);
    expect(decide(s, cs, { asked, preferencesConfirmed: true })).toEqual({ type: 'match' });
  });

  it('allows a 4th question for an unresolved hard constraint (PRD §4.4)', () => {
    const d = decide(investigateSignals, cs, { asked: ['q1', 'q2', 'q3'], preferencesConfirmed: true });
    expect(d.type === 'ask' && d.question.target.kind).toBe('constraint');
  });

  it("doesn't ask a question whose likely answers would leave nobody to recommend", () => {
    const onlyPricey = cs.filter((c) => (c.practical.gapAfterMedicare ?? Infinity) > 50);
    const cost = scoreQuestions(demoAnswered, onlyPricey, []).find((q) => q.question.id === 'cost')!;
    expect(cost.gain).toBe(0);
  });

  it('allows a 4th question only when nothing credible fits yet, and never a 5th', () => {
    expect(decide(vagueSignals, cs, { asked: ['q1', 'q2', 'q3'], preferencesConfirmed: true }).type).toBe('ask');
    expect(decide(vagueSignals, cs, { asked: ['q1', 'q2', 'q3', 'q4'], preferencesConfirmed: true }).type).toBe('match');
    expect(MAX_QUESTIONS).toBe(3);
  });

  it('pauses for safety before anything else', () => {
    expect(decide(urgentSignals, cs, fresh)).toEqual({ type: 'safety' });
  });

  it('confirms preferences only when an uncertain one would change the top 3 (PRD §18)', () => {
    expect(preferencesToConfirm(demoAnswered, cs)).toEqual([]);
    const shakyPace: PatientSignals = {
      ...demoAnswered,
      preferences: { ...demoAnswered.preferences, consultation_pace: { value: 'unhurried', confidence: 'medium' } },
    };
    expect(preferencesToConfirm(shakyPace, cs)).toContain('consultation_pace');
    const shakyExplanation: PatientSignals = {
      ...demoAnswered,
      preferences: { ...demoAnswered.preferences, explanation_depth: { value: 'detailed', confidence: 'medium' } },
    };
    expect(preferencesToConfirm(shakyExplanation, cs)).toEqual([]);
    expect(decide(shakyPace, cs, { asked: ['decision_style'], preferencesConfirmed: false }).type).toBe('confirm');
  });
});

describe('top-3 selection (PRD §31, §43)', () => {
  const s = (id: string, total: number, clinical: number, practice: number, fit: Scored['fit'] = 'Good fit'): Scored => ({
    clinicianId: id,
    total,
    layers: { clinical, practice, practical: 0.5 },
    fit,
  });

  it('always puts the best overall fit first', () => {
    expect(ids(selectTop([s('a', 0.8, 0.9, 0.5), s('b', 0.79, 0.4, 0.9)]))[0]).toBe('a');
  });

  it('prefers a different kind of fit among near-ties', () => {
    const ranked = [s('a', 0.8, 0.5, 0.9), s('b', 0.7, 0.5, 0.9), s('c', 0.7 - NEAR_TIE / 2, 0.9, 0.5), s('d', 0.6, 0.5, 0.8)];
    expect(ids(selectTop(ranked))).toEqual(['a', 'c', 'b']);
  });

  it('never trades quality for variety', () => {
    const outsideTie = [s('a', 0.8, 0.5, 0.9), s('b', 0.7, 0.5, 0.9), s('c', 0.7 - NEAR_TIE * 2, 0.9, 0.5)];
    expect(ids(selectTop(outsideTie))).toEqual(['a', 'b', 'c']);
    const differentLabel = [s('a', 0.8, 0.5, 0.9), s('b', 0.7, 0.5, 0.9), s('c', 0.69, 0.9, 0.5, 'Worth considering')];
    expect(ids(selectTop(differentLabel))).toEqual(['a', 'b', 'c']);
  });

  it('returns fewer than 3 rather than padding, and skips anyone below the fit threshold', () => {
    expect(ids(selectTop([s('a', 0.8, 0.5, 0.9), s('b', 0.4, 0.5, 0.9, null)]))).toEqual(['a']);
    expect(selectTop([])).toEqual([]);
  });
});

describe('recommend', () => {
  it('returns the PRD demo result: Amy first with the three demo reasons', () => {
    const r = recommend(demoAnswered, cs, ['decision_style']);
    expect(r.status).toBe('matches');
    if (r.status !== 'matches') return;
    expect(ids(r.matches)).toEqual(['amy-chen', 'tom-walsh', 'priya-nair']);
    expect(r.matches[0].fit).toBe('Strong fit');
    expect(r.matches[0].reasons.map((x) => x.evidenceId)).toEqual([
      'amy-chen-consultation_pace',
      'amy-chen-mental_health_integration',
      'amy-chen-shared_decision_making',
    ]);
    expect(r.matches[0].reasons[0].signal).toBe('You said rushed appointments have not worked for you.');
  });

  it('shows only the clinicians who meet a hard constraint (partial results)', () => {
    const r = recommend(withConstraints(demoAnswered, { mode: 'in_person_only', origin: NEW_FARM, maxKm: 2 }), cs);
    expect(r.status === 'matches' && ids(r.matches)).toEqual(['amy-chen', 'sam-patel']);
  });

  it("says there's no strong match and suggests what would help", () => {
    const k = { mode: 'in_person_only' as const, needsWeekend: true, origin: NEW_FARM, maxKm: 5 };
    const r = recommend(withConstraints(demoAnswered, k), cs, ['decision_style']);
    // Another question can't help while the constraints exclude everyone, so it isn't offered.
    expect(r).toEqual({ status: 'none', actions: ['include_telehealth', 'expand_distance'] });
  });

  it('asks for more rather than guessing when it knows too little', () => {
    expect(recommend(vagueSignals, cs)).toEqual({ status: 'none', actions: ['answer_more'] });
  });

  it('keeps extra options separate, explained, and excluding the ones already shown', () => {
    const r = recommend(withConstraints(demoAnswered, { mode: 'telehealth_only' }), cs);
    if (r.status !== 'matches') throw new Error('expected matches');
    expect(r.more.length).toBeGreaterThan(0);
    expect(r.more.length).toBeLessThanOrEqual(3);
    for (const m of r.more) {
      expect(ids(r.matches)).not.toContain(m.clinicianId);
      expect(m.reasons.length).toBeGreaterThan(0);
    }
  });

  it('never sends scores or interview excerpts to the patient', () => {
    const json = JSON.stringify(recommend(demoAnswered, cs));
    expect(json).not.toMatch(/"total"|"layers"|0\.\d{3}/);
    for (const c of cs) for (const e of c.evidence) expect(json).not.toContain(e.excerpt);
  });
});

describe('explanations (PRD §4.8–4.9, §26–27, §32)', () => {
  const signalSets: [string, PatientSignals][] = [
    ['demo', demoSignals],
    ['demo answered', demoAnswered],
    ['efficient', efficientSignals],
    ['investigate', investigateSignals],
    ['demo, bulk billed', withConstraints(demoAnswered, { maxGap: 0 })],
    ['demo, telehealth', withConstraints(demoAnswered, { mode: 'telehealth_only' })],
  ];

  it.each(signalSets)('%s: every shown reason is grounded, approved and within the limits', (_n, s) => {
    const r = recommend(s, cs);
    const shown = r.status === 'matches' ? [...r.matches, ...r.more] : [];
    for (const m of shown) {
      const c = byId(m.clinicianId);
      expect(m.reasons.length).toBeGreaterThan(0);
      expect(m.reasons.length).toBeLessThanOrEqual(3);
      expect(new Set(m.reasons.map((x) => x.evidenceId)).size).toBe(m.reasons.length);
      for (const reason of m.reasons) {
        const ev = c.evidence.find((e) => e.id === reason.evidenceId)!;
        expect(ev.reviewerStatus).toBe('approved');
        expect(CONFIDENCE[ev.confidence]).toBeGreaterThanOrEqual(CONFIDENCE.medium);
        expect(reason.evidence).toBe(ev.patientFacing);
        expect(reason.signal).toMatch(/^You/);
        expect(copyProblems(reason.signal)).toEqual([]);
        expect(copyProblems(reason.evidence)).toEqual([]);
      }
    }
  });

  it('never cites a draft trait', () => {
    const wantsContinuity: PatientSignals = {
      ...demoAnswered,
      preferences: { ...demoAnswered.preferences, continuity: { value: 'high', confidence: 'high' } },
    };
    const reasons = reasonsFor(byId('lucy-nguyen'), wantsContinuity);
    expect(reasons.map((x) => x.evidenceId)).not.toContain('lucy-nguyen-continuity');
  });

  it('summarises practice style (max 5) and experience (max 4) from approved evidence', () => {
    for (const c of cs) {
      expect(practiceStyle(c).length).toBeLessThanOrEqual(5);
      expect(experiencedWith(c).length).toBeLessThanOrEqual(4);
      for (const line of practiceStyle(c)) expect(copyProblems(line)).toEqual([]);
    }
    expect(practiceStyle(byId('lucy-nguyen'))).not.toContain('Continuity of care');
    expect(experiencedWith(byId('amy-chen'))).toEqual(['Adult ADHD', 'Sleep', 'Mental health', "Women's health"]);
  });

  it('flags banned adjectives, winner language and percentages', () => {
    expect(copyProblems('Dr Smith is holistic and caring.')).toEqual(['unsupported adjective']);
    expect(copyProblems('Your perfect match')).toEqual(['winner language']);
    expect(copyProblems('97% fit')).toEqual(['percentage']);
  });
});

describe('question bank (PRD §13–16)', () => {
  it.each(QUESTIONS.map((q) => [q.id, q]))('%s: one sentence, behavioural, 2–6-word options, "Not sure" offered', (_id, q) => {
    expect(q.text.match(/[.?!](\s|$)/g) ?? []).toHaveLength(1);
    expect(q.text).not.toMatch(/communication style|collaborative|on a scale|1-10/i);
    expect(q.options.map((o) => o.label)).toContain(NOT_SURE);
    expect(new Set(q.options.map((o) => o.label)).size).toBe(q.options.length);
    for (const o of q.options) {
      const words = o.label.split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(2);
      expect(words).toBeLessThanOrEqual(6);
    }
  });

  it('never asks about clinician gender (only honoured when the patient raises it)', () => {
    expect(QUESTIONS.some((q) => q.target.kind === 'constraint' && q.target.key === 'clinicianGender')).toBe(false);
  });

  it('"Not sure" changes nothing', () => {
    expect(applyAnswer(demoSignals, 'decision_style', NOT_SURE)).toBe(demoSignals);
  });
});
