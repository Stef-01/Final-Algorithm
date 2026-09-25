import { ADVICE_REPLY } from '@/features/match/refine';
import { scenarios } from '@/features/match/sessionCore';

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
