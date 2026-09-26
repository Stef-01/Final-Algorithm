import { professionals } from '@server/data/professionals';

import { buildConversation } from '@/features/connect/demoChat';

const all = ['goals', 'practical', 'chats'] as const;
const byName = new Map(professionals.map((c) => [c.name, c]));

describe('the Connect your AI example chat', () => {
  const turns = buildConversation([...all], []);

  it('has the four messages, each with a real tool call', () => {
    expect(turns.map((t) => t.ask)).toEqual([
      expect.stringMatching(/recent stress .* work drama/),
      expect.stringMatching(/executives like me/),
      expect.stringMatching(/as a mother/),
      expect.stringMatching(/strengths-based mindset .* Byron psychologist last year/),
    ]);
    for (const t of turns) expect(t.results.length).toBeGreaterThan(0);
  });

  it('never claims what no profile says: nobody lists executives', () => {
    expect(turns[1].reply).toMatch(/^None of them mention executives/);
    expect(turns[1].args.look_for).toContain('executives');
  });

  it('quotes profiles for mums and a strengths-based approach', () => {
    expect(turns[2].reply).toMatch(/Samantha/);
    expect(turns[3].reply).toMatch(/strengths-based/);
    expect(turns[3].reply).toMatch(/Samantha Courtney also mentions mums/);
  });

  it('every quote in a reply is word for word from that person’s profile', () => {
    for (const t of turns) {
      for (const [, who, quote] of t.reply.matchAll(/([A-Z][\w’'-]+ [A-Z][\w’'-]+)(?:[:,]| is a mum herself,) (?:says )?“([^”]+)”/g)) {
        const c = byName.get(who)!;
        const text = [c.bio, ...c.evidence.map((e) => e.patientFacing)].join(' ');
        expect(text).toContain(quote.replace(/^…|…$/g, ''));
      }
    }
  });

  it('uses only the goals that bear on the conversation', () => {
    const t = buildConversation([...all], ['assessed', 'pain', 'stress'])[0];
    expect(t.args.needs).toEqual(['Stress', 'Career and performance']);
    expect(t.used.filter((u) => u.from === 'WATL goal').map((u) => u.label)).toEqual(['Manage stress']);
  });

  it('names the earlier chats it drew on, with dates; last year is context, not a search', () => {
    const chats = turns.flatMap((t) => t.used.filter((u) => u.from === 'Your chats'));
    expect(chats.length).toBeGreaterThan(3);
    for (const u of chats) expect(u.chat).toEqual({ title: expect.any(String), date: expect.stringMatching(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/) });
    expect(chats.map((u) => u.chat!.title)).toContain('Bad experience with the Byron psychologist');
    expect(turns[3].reply).toMatch(/deficit focus you described last year/);
  });

  it('only uses chat history if you let it', () => {
    const off = buildConversation(['goals', 'practical'], []);
    expect(off.flatMap((t) => t.used.map((u) => u.from))).not.toContain('Your chats');
  });
});
