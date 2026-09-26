import { findProfessionals } from '@server/mcp';

import { GOALS } from '@/features/care/plan';

import type { Share } from './connection';

// The example chat on Connect your AI: four messages from someone whose assistant already knows
// their story, each followed by the real find_professionals call it would make and a reply built
// only from what that call returns. Nothing about a professional is written here: every claim in a
// reply is a reason the engine gave or a sentence quoted from their own profile. Full names
// throughout: first names clash (two Kates). If nobody's
// profile says something (like "executives"), the reply says so.

/** Something the assistant used; from past chats, it names the conversation it came from. */
export type Used = { label: string; from: 'You said' | 'Your chats' | 'WATL goal' | 'Your limits'; chat?: { title: string; date: string } };

// The example person's earlier conversations with their assistant (made up for the demo).
const chat = (label: string, title: string, date: string): Used => ({ label, from: 'Your chats', chat: { title, date } });
type Result = ReturnType<typeof findProfessionals>['results'][number];
export type Turn = { ask: string; used: Used[]; args: Record<string, unknown>; results: Result[]; reply: string };


/** A few words either side of the phrase, so a long profile sentence reads as a short quote. */
export function snippet(quote: string, phrase: string, around = 7) {
  const words = quote.split(/\s+/);
  const needle = phrase.toLowerCase().replace(/-/g, ' ').split(' ')[0];
  const at = words.findIndex((w) => w.toLowerCase().replace(/-/g, ' ').includes(needle));
  if (at < 0) return quote;
  const from = Math.max(0, at - around);
  const to = Math.min(words.length, at + around + 1);
  return `${from > 0 ? '…' : ''}${words.slice(from, to).join(' ').replace(/[.,;]$/, '')}${to < words.length ? '…' : ''}`;
}

/** Who says any of these phrases in their own profile, each with the first quote found. */
function saying(results: Result[], phrases: string[]) {
  return results.flatMap((r) => {
    const m = (r.profile_mentions ?? []).find((x) => phrases.includes(x.phrase));
    return m ? [{ r, m }] : [];
  });
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join('; ')}; and ${xs.at(-1)}`);

export function buildConversation(shares: Share[], goals: string[]): Turn[] {
  const chats = shares.includes('chats');
  const needs = ['Stress', 'Career and performance'];
  const base: Record<string, unknown> = { needs, limit: 4 };
  if (shares.includes('practical')) base.mode = 'any';
  // Only goals that bear on this conversation (work stress): an unrelated goal would skew the search.
  const goalAreas = shares.includes('goals')
    ? GOALS.filter((g) => goals.includes(g.id) && ['stress', 'focus'].includes(g.id)).map((g) => ({ label: g.label, area: g.areas![0] }))
    : [];
  for (const g of goalAreas) if (!needs.includes(g.area)) needs.push(g.area);

  const turns: Turn[] = [];

  // 1. The work drama.
  {
    const args = { ...base };
    const results = findProfessionals(args).results;
    const withWhy = results.filter((r) => r.why.length).slice(0, 2);
    turns.push({
      ask: 'Find someone who understands the recent stress I’ve been going through with the work drama.',
      used: [
        { label: 'Stress at work', from: 'You said' },
        ...(chats ? [chat('Conflict with the leadership team', 'Handling the leadership team fallout', '18 Sep 2026'), chat('Going on two months', 'Work stress, week by week', '2 Aug 2026')] : []),
        ...goalAreas.map((g) => ({ label: g.label, from: 'WATL goal' }) as Used),
      ],
      args,
      results,
      reply: withWhy.length
        ? `Given what’s been happening at work, here’s where I’d start. ${withWhy.map((r) => `${r.name}: ${r.why[0].evidence}`).join(' ')} Want me to narrow it down?`
        : 'I found a few people, but nobody’s profile speaks to work stress directly. Want me to widen it?',
    });
  }

  // 2. Executives.
  const lead = ['executives', 'leadership', 'leaders', 'professionals', 'career and performance'];
  {
    const args = { ...base, look_for: lead };
    const results = findProfessionals(args).results;
    const exec = saying(results, ['executives']);
    const near = saying(results, lead.filter((x) => x !== 'executives'));
    turns.push({
      ask: 'Out of these options, I want someone who’s versed in working with executives like me.',
      used: [{ label: 'Works with executives', from: 'You said' }, ...(chats ? [chat('You lead a team of 40', 'Restructure plan for my team', '9 Jul 2026')] : [])],
      args,
      results,
      reply: exec.length
        ? `${list(exec.map(({ r, m }) => `${r.name} says “${snippet(m.quote, m.phrase)}”`))}.`
        : `None of them mention executives in their profiles, so I won’t claim it. Closest: ${list(near.slice(0, 2).map(({ r, m }) => `${r.name}, “${snippet(m.quote, m.phrase)}”`)) || 'nobody yet'}.`,
    });
  }

  // 3. Being a mum.
  const mum = ['mums', 'mum', 'mothers', 'mother', 'parenthood', 'new parents'];
  {
    const args = { ...base, needs: [...needs, 'Life transitions'], look_for: [...mum, 'leadership', 'professionals'] };
    const results = findProfessionals(args).results;
    const mums = saying(results, mum);
    turns.push({
      ask: 'I want someone who understands also having to manage the responsibilities I face as a mother.',
      used: [{ label: 'Being a mum', from: 'You said' }, ...(chats ? [chat('Two kids at primary school', 'School holiday juggling', '21 Jun 2026')] : [])],
      args,
      results,
      reply: mums.length
        ? `For juggling that as a mum: ${list(
            mums.slice(0, 2).map(({ r, m }) =>
              // "mum" on its own is about them, not their clients: say so.
              ['mum', 'mother'].includes(m.phrase) ? `${r.name} is a mum herself, “${snippet(m.quote, m.phrase)}”` : `${r.name}, “${snippet(m.quote, m.phrase)}”`,
            ),
          )}.`
        : 'Nobody here mentions working with mums in their profile. Want me to look more widely?',
    });
  }

  // 4. Strengths-based, after last year.
  const strengths = ['strengths-based', 'strengths based', 'strengths'];
  {
    const args = { ...base, needs: [...needs, 'Life transitions'], look_for: ['strengths-based', ...mum.slice(0, 3), 'leadership'], style: { shared_decision_making: 'shared' } };
    const results = findProfessionals(args).results;
    const strong = saying(results, strengths);
    const both = strong.filter(({ r }) => (r.profile_mentions ?? []).some((x) => mum.includes(x.phrase)));
    turns.push({
      ask: 'Find someone who has that strengths-based mindset I was telling you about before, after the issues I had with that other Byron psychologist last year.',
      used: [
        { label: 'Strengths-based', from: 'You said' },
        ...(chats ? [
              chat('Last psychologist felt deficit-focused', 'Bad experience with the Byron psychologist', '3 Nov 2025'),
              chat('Wants strengths-based care', 'What I want from therapy next time', '10 Jan 2026'),
            ] : []),
      ],
      args,
      results,
      reply: strong.length
        ? `${list(strong.slice(0, 2).map(({ r, m }) => `${r.name}: “${snippet(m.quote, m.phrase)}”`))}.${both.length ? ` ${both[0].r.name} also mentions mums, so I’d start there.` : ''}${chats ? ' Strengths-based is a different starting point from the deficit focus you described last year.' : ''}`
        : 'None of these say “strengths-based” in their profiles. I can ask WATL for more people.',
    });
  }
  return turns;
}
