import { professionals } from '@server/data/professionals';
import { copyProblems } from '@server/engine/explain';

import { signalsFor } from '@/features/match/agent';
import { extractSignals } from '@/features/match/extract';
import { applyRefinement, professionSwitch, refineSuggestions, SUGGESTION_TEXT } from '@/features/match/refine';
import * as core from '@/features/match/sessionCore';

const byId = new Map(professionals.map((c) => [c.id, c]));
const all = (s: core.SessionState) => (s.result?.status === 'matches' ? [...s.result.matches, ...s.result.more] : []);
const last = (s: core.SessionState) => s.chat!.at(-1)!;

describe('refine assistant', () => {
  const start = () => core.demoResults('psych-masking');

  it('re-ranks in place and says exactly what changed', () => {
    const t = core.refine(start(), 'Online only');
    expect(t.route).toBe('/refine');
    expect(last(t.state)).toMatchObject({ from: 'agent', action: 'see_matches' });
    expect(last(t.state).text).toMatch(/^Done: now online sessions only\. \d+ psychologists fit, and \w+ is first\.$/);
    for (const m of all(t.state)) expect(byId.get(m.clinicianId)!.practical.modes).toContain('telehealth');
    expect(t.state.index).toBe(0);
  });

  it('newer refinements override older ones', () => {
    let s = core.refine(start(), 'Online only').state;
    s = core.refine(s, 'online or in person is fine').state;
    expect(signalsFor(s.input).constraints.mode).toBe('any');
    expect(last(s).text).toContain('online or in person');
  });

  it('asking for someone more direct puts straight talkers first', () => {
    const s = core.refine(start(), 'Someone more direct').state;
    expect(signalsFor(s.input).preferences.communication_directness).toEqual({ value: 'direct', confidence: 'high' });
    expect(last(s).text).toContain('straight talking');
  });

  it('"less blunt" means gentler', () => {
    expect(applyRefinement(signalsFor(start().input), 'maybe less blunt').preferences.communication_directness?.value).toBe('gentle');
  });

  it('loosens a requirement when asked', () => {
    const bulk = core.refine(start(), 'Bulk billed only').state;
    expect(signalsFor(bulk.input).constraints.maxGap).toBe(0);
    const relaxed = core.refine(bulk, 'Cost doesn’t matter').state;
    expect(signalsFor(relaxed.input).constraints.maxGap).toBeNull();
    expect(last(relaxed).text).toContain('any cost');
  });

  it('switches profession', () => {
    expect(professionSwitch('actually show GPs instead')).toBe('gp');
    expect(professionSwitch('I saw a GP last week')).toBeUndefined();
    const s = core.refine(start(), 'Show GPs instead').state;
    expect(s.input.profession).toBe('gp');
    for (const m of all(s)) expect(byId.get(m.clinicianId)!.profession).toBe('gp');
    expect(last(s).text).toMatch(/GPs instead/);
  });

  it("says so when it can't find a change, and changes nothing", () => {
    const s0 = start();
    const s = core.refine(s0, 'hmm').state;
    expect(last(s).text).toMatch(/couldn't pick out a change/);
    expect(s.result).toEqual(s0.result);
    expect(s.input.refinements ?? []).toEqual([]);
  });

  it('keeps the current list when a change would leave nobody', () => {
    const s0 = core.refine(start(), 'Bulk billed only').state;
    const s = core.refine(s0, 'in person, female psychologist, weekends').state;
    if (s.result === s0.result) expect(last(s).text).toMatch(/No one fits once I add/);
    expect(all(s).length).toBeGreaterThan(0);
  });

  it('routes urgent wording to the safety pause', () => {
    expect(core.refine(start(), 'I have chest pain').route).toBe('/safety');
  });

  it('starts a search when there are no results yet', () => {
    const t = core.refine(core.initialState('psychologist'), 'I have ADHD and want practical strategies');
    expect(t.route === '/matching' || t.route === '/confirm' || t.route.startsWith('/clarify')).toBe(true);
    expect(t.state.chat!.map((c) => c.from)).toEqual(['you', 'agent']);
  });

  it('every suggestion chip does something, in plain words', () => {
    for (const p of ['gp', 'psychologist'] as const) {
      const s0 = core.demoResults(p === 'gp' ? 'gp-female' : 'psych-masking');
      for (const chip of refineSuggestions(p)) {
        expect(SUGGESTION_TEXT[chip]).toBeDefined();
        const reply = last(core.refine(s0, chip).state).text;
        expect(reply).not.toMatch(/couldn't pick out/);
        expect(copyProblems(reply)).toEqual([]);
      }
    }
  });
});

describe('refine assistant: where', () => {
  it('any place named in a refinement sets where to look from', () => {
    const t = core.refine(core.demoResults('psych-masking'), 'somewhere in Southport');
    const k = signalsFor(t.state.input).constraints;
    expect(k.originLabel).toBe('Southport');
    expect(k.maxKm).toBe(15);
    expect(last(t.state).text).toMatch(/^Done: now within 15 km of Southport\./);
  });

  it('"closer" halves the distance when a place is known', () => {
    const s0 = core.refine(core.demoResults('psych-masking'), 'near Brisbane CBD').state;
    const t = core.refine(s0, 'closer please');
    expect(signalsFor(t.state.input).constraints.maxKm).toBe(8);
    expect(last(t.state).text).toContain('within 8 km of Brisbane CBD');
  });

  it('"closer" with no place asks where instead of pretending', () => {
    const s0 = core.demoResults('psych-masking');
    const t = core.refine(s0, 'Closer to me');
    expect(last(t.state).text).toMatch(/^Closer to where\?/);
    expect(t.state.result).toBe(s0.result);
  });

  it('the describe screen still needs "near" to count a place (so "grew up in Sydney" doesn\'t)', () => {
    expect(extractSignals('I grew up in Sydney').constraints.origin).toBeUndefined();
    expect(extractSignals('I live near Southport').constraints.originLabel).toBe('Southport');
  });
});
