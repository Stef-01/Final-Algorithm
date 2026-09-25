import { clinicians, getClinician } from '@/data/clinicians';
import { decisionQuestion, DEMO_TEXT, rushedQuestion } from '@/features/match/fixtureAgent';
import * as core from '@/features/match/sessionCore';
import type { Match, MatchResult } from '@/features/match/types';

const start = (text: string) => core.submitText(core.initialState(), text);
const answerDecision = (t: core.Transition, a: string) => core.answer(t.state, decisionQuestion.id, a);
const matchesOf = (r?: MatchResult): Match[] => (r?.status === 'matches' ? r.matches : []);

describe('agent decision policy (fixture)', () => {
  it('asks exactly one follow-up for the PRD demo, then stops', () => {
    const t1 = start(DEMO_TEXT);
    expect(t1.route).toBe(`/clarify?q=${decisionQuestion.id}`);
    const t2 = answerDecision(t1, 'Explain them and decide together');
    expect(t2.route).toBe('/matching');
    expect(t2.state.asked).toHaveLength(1);
  });

  it('shows preference confirmation only when the answer leaves things uncertain', () => {
    const t = answerDecision(start(DEMO_TEXT), 'Not sure');
    expect(t.route).toBe('/confirm');
    expect(t.state.priorities).toEqual([
      'Longer appointments',
      'Sleep and mental health together',
      'Explains the reasons',
      'ADHD experience',
    ]);
  });

  it('removing a priority removes the matching reason', () => {
    const confirm = answerDecision(start(DEMO_TEXT), 'Not sure');
    const t = core.confirmPriorities(confirm.state, ['Longer appointments']);
    expect(t.route).toBe('/matching');
    const amy = matchesOf(core.match(t.state).state.result)[0];
    expect(amy.reasons.map((r) => r.signal)).not.toContain("You said rushed appointments haven't worked for you.");
  });

  it('pauses for safety before asking anything, then carries on once acknowledged', () => {
    const t = start('I have chest pain and need a GP who explains things.');
    expect(t.route).toBe('/safety');
    expect(core.acknowledgeSafety(t.state).route).toBe(`/clarify?q=${decisionQuestion.id}`);
  });

  it('never asks more than the one extra question', () => {
    let t = core.match(answerDecision(start('I need a new GP.'), 'Not sure').state);
    expect(t.state.result).toEqual({ status: 'none', actions: ['answer_more'] });
    t = core.noMatchAction(t.state, 'answer_more');
    expect(t.route).toBe(`/clarify?q=${rushedQuestion.id}`);
    t = core.match(core.answer(t.state, rushedQuestion.id, 'No idea really').state);
    expect(t.state.result).toEqual({ status: 'none', actions: [] });
  });
});

describe('matching results (fixture)', () => {
  const demo = () => core.match(answerDecision(start(DEMO_TEXT), 'Explain them and decide together').state).state;

  it('returns Amy (strong fit) first, then two good fits, for the demo', () => {
    const matches = matchesOf(demo().result);
    expect(matches.map((m) => [m.clinicianId, m.fit])).toEqual([
      ['amy-chen', 'Strong fit'],
      ['priya-nair', 'Good fit'],
      ['tom-walsh', 'Good fit'],
    ]);
  });

  it("gives Amy the PRD demo's three reasons", () => {
    const amy = matchesOf(demo().result)[0];
    expect(amy.reasons.map((r) => r.evidenceId)).toEqual(['amy-pace', 'amy-integration', 'amy-sdm']);
  });

  it('matches the decision reason to the answer given', () => {
    const t = core.match(answerDecision(start(DEMO_TEXT), 'Recommend the best one').state).state;
    expect(matchesOf(t.result)[0].reasons[2].evidenceId).toBe('amy-direct');
  });

  it('shows only the clinicians who fit a hard constraint, without padding to 3', () => {
    const t = core.match(answerDecision(start(`${DEMO_TEXT} I need a GP who bulk bills.`), 'Explain them and decide together').state);
    expect(matchesOf(t.state.result).map((m) => m.clinicianId)).toEqual(['priya-nair', 'tom-walsh']);
  });

  it('offers telehealth when nobody fits in person on the weekend', () => {
    const t = core.match(
      answerDecision(start('I need longer appointments on the weekend, in person.'), 'Explain them and decide together').state,
    );
    expect(t.state.result).toEqual({ status: 'none', actions: ['include_telehealth'] });
    const widened = core.noMatchAction(t.state, 'include_telehealth');
    expect(matchesOf(widened.state.result).map((m) => [m.clinicianId, m.fit])).toEqual([
      ['grace-okafor', 'Worth considering'],
    ]);
  });

  it('keeps extra options hidden until asked for', () => {
    const s = demo();
    expect(s.result?.status === 'matches' && s.result.more.map((m) => m.clinicianId)).toEqual(['grace-okafor']);
    const more = core.showMore(s);
    expect(matchesOf(more.result)).toHaveLength(4);
    expect(more.index).toBe(3);
  });

  it('steps through matches and stops at the end of the list', () => {
    let s = demo();
    for (let i = 0; i < 5; i++) s = core.nextMatch(s);
    expect(s.index).toBe(3);
    expect(core.currentMatch(s)).toBeUndefined();
  });
});

// PRD §4.6, §4.8–4.9, §26–27, §32 — checked over every review state and the clinician data.
describe('explanation rules', () => {
  const BANNED = /\b(caring|compassionate|holistic|warm|patient-centred|patient-centered|thorough|understanding)\b/i;
  const WINNER = /perfect match|best doctor|ideal clinician|number one/i;

  const allMatches = core.scenarios.flatMap((s) => {
    let state = s.build().state;
    if (!state.result && state.input.answers[decisionQuestion.id]) state = core.match(state).state;
    return matchesOf(state.result);
  });

  it('builds at least one match in the review states', () => {
    expect(allMatches.length).toBeGreaterThan(0);
  });

  it.each(allMatches.map((m, i) => [`${m.clinicianId} #${i}`, m]))('%s: ≤3 reasons, each grounded in evidence', (_n, m) => {
    const c = getClinician(m.clinicianId)!;
    expect(m.reasons.length).toBeGreaterThan(0);
    expect(m.reasons.length).toBeLessThanOrEqual(3);
    for (const r of m.reasons) {
      const ev = c.evidence.find((e) => e.id === r.evidenceId);
      expect(ev).toBeDefined();
      expect(r.evidence).toBe(ev!.patientFacing);
      expect(r.signal).toMatch(/^You/);
    }
  });

  it('never uses unsupported adjectives, winner language or percentages in patient-facing copy', () => {
    const copy = [
      ...allMatches.flatMap((m) => m.reasons.flatMap((r) => [r.signal, r.evidence])),
      ...clinicians.flatMap((c) => [c.bio, ...c.practiceStyle, ...c.experiencedWith, ...c.evidence.map((e) => e.patientFacing)]),
      decisionQuestion.ack,
      decisionQuestion.text,
      rushedQuestion.ack,
      rushedQuestion.text,
    ];
    for (const line of copy) {
      expect(line).not.toMatch(BANNED);
      expect(line).not.toMatch(WINNER);
      expect(line).not.toMatch(/\d\s*%/);
    }
  });

  it('keeps agent lines to one sentence and options to 2–6 words (PRD §16)', () => {
    for (const q of [decisionQuestion, rushedQuestion]) {
      for (const line of [q.ack, q.text]) expect(line.match(/[.?!](\s|$)/g) ?? []).toHaveLength(1);
      for (const o of q.options) {
        const words = o.split(/\s+/).length;
        expect(words).toBeGreaterThanOrEqual(2);
        expect(words).toBeLessThanOrEqual(6);
      }
    }
  });

  it('shows at most 4 experience areas and 5 practice behaviours per clinician', () => {
    for (const c of clinicians) {
      expect(c.experiencedWith.length).toBeLessThanOrEqual(4);
      expect(c.practiceStyle.length).toBeLessThanOrEqual(5);
    }
  });
});
