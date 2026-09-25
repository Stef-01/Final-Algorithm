import { ADVICE_REPLY } from '@/features/match/refine';
import { runMatching } from '@/features/match/agent';
import { demoResults, noMatchAction, scenarios } from '@/features/match/sessionCore';

// /dev/states is how screens get reviewed, so each state must really show what its label says.

const byId = (id: string) => scenarios.find((s) => s.id === id)!.build();

describe('review states (/dev/states)', () => {
  it.each(scenarios.map((s) => [s.id, s]))('%s builds', (_id, s) => {
    const t = s.build();
    expect(t.route).toMatch(/^\//);
  });

  it('"No strong match" really has no match', () => {
    const t = byId('no-match');
    expect(t.state.result?.status).toBe('none');
    expect(t.route).toBe('/matches');
  });

  it('"Only 1 fits" really has one', () => {
    const r = byId('partial').state.result;
    expect(r?.status === 'matches' && r.matches.length + r.more.length).toBe(1);
  });

  it('the three matches states show matches 1, 2 and 3', () => {
    expect(['match-1', 'match-2', 'match-3', 'end'].map((id) => byId(id).state.index)).toEqual([0, 1, 2, 3]);
  });

  it('assistant states show a change and a declined medical question', () => {
    expect(byId('assistant-refined').state.chat!.at(-1)!.text).toMatch(/^Done — now online sessions only/);
    expect(byId('assistant-advice').state.chat!.at(-1)!.text).toBe(ADVICE_REPLY);
    expect(byId('safety').route).toBe('/safety');
  });
});

describe('no-match: offering the one change that would help', () => {
  const noMatch = () => byId('no-match').state;

  it('offers cost when cost is what rules everyone out, and taking it lists GPs', () => {
    const s = noMatch();
    expect(s.result).toMatchObject({ status: 'none' });
    const actions = s.result!.status === 'none' ? s.result!.actions : [];
    expect(actions[0]).toBe('any_cost');
    const t = noMatchAction(s, 'any_cost');
    expect(t.state.result?.status).toBe('matches');
    expect(t.route).toBe('/matches');
  });

  it('offers the other profession when that alone would help', () => {
    const s = noMatch();
    const actions = s.result!.status === 'none' ? s.result!.actions : [];
    expect(actions).toContain('any_profession');
    const t = noMatchAction(s, 'any_profession');
    expect(t.state.profession).toBe('either');
    expect(t.state.result?.status).toBe('matches');
  });

  it('offers any gender only when gender is part of the problem', () => {
    // Gold Coast, in person: nobody there publishes their gender, so any gender requirement rules everyone out.
    const s = demoResults('psych-gold-coast');
    const input = { ...s.input, refinements: ['female psychologist'], refinementExtracts: [null] };
    const r = runMatching(input);
    expect(r.status).toBe('none');
    if (r.status === 'none') expect(r.actions).toContain('any_gender');
    const t = noMatchAction({ ...s, input, result: r }, 'any_gender');
    expect(t.state.result?.status).toBe('matches');
    // Nothing is offered that wouldn't help.
    if (noMatch().result!.status === 'none') expect((noMatch().result as { actions: string[] }).actions).not.toContain('any_gender');
  });
});
