/**
 * @jest-environment node
 */
// Claude-worded assistant replies, with the SDK mocked: no network, no API spend.
import redteam from '../evals/redteam.json';
import { checkReply, type ReplyFacts } from '../server/claude/reply';

import * as core from '@/features/match/sessionCore';

const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status = 500;
  }
  const Anthropic = jest.fn().mockImplementation(() => ({ beta: { messages: { create: mockCreate } } }));
  Object.assign(Anthropic, { APIError });
  return { __esModule: true, default: Anthropic };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require('../api/reply') as typeof import('../api/reply');

const facts: ReplyFacts = { said: 'online only', changes: ['online sessions only'], count: 8, noun: 'psychologists', first: 'Alice' };
const answer = (reply: string, stop_reason = 'end_turn') => ({ stop_reason, content: [{ type: 'text', text: JSON.stringify({ reply }) }] });
const post = (body: unknown) => api.POST(new Request('http://x/api/reply', { method: 'POST', headers: { origin: 'http://x' }, body: JSON.stringify(body) }));

describe('checking a worded reply', () => {
  it('accepts a reply that keeps the facts', () => {
    expect(checkReply('Sure — I’ve kept it to online sessions. 8 psychologists fit, and Alice is first.', facts)).toBeTruthy();
  });

  it.each([
    ['drops the count', 'Sure, online sessions only now, and Alice is first.'],
    ['drops the name', 'Online only now: 8 psychologists fit.'],
    ['praises someone', 'Online only — 8 psychologists fit, and the wonderfully caring Alice is first.'],
    ['says best', 'Online only. 8 psychologists fit, and Alice is the best match.'],
    ['mentions medication', 'Online only. 8 psychologists fit; Alice is first and can review your medication.'],
    ['gives a dose', 'Online only, 8 fit, Alice first. Try 10 mg.'],
    ['exclaims', 'Done! 8 psychologists fit and Alice is first.'],
    ['is too long', `8 psychologists fit and Alice is first. ${'More words. '.repeat(30)}`],
  ])('rejects one that %s', (_why, reply) => {
    expect(checkReply(reply, facts)).toBeNull();
  });
});

describe('POST /api/reply', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env, ANTHROPIC_API_KEY: 'k', WATL_CLAUDE_REPLIES: 'on' };
    mockCreate.mockReset();
  });
  afterAll(() => {
    process.env = env;
  });

  it('is off unless switched on', async () => {
    process.env = { ...env, ANTHROPIC_API_KEY: 'k' };
    expect(await api.GET().json()).toEqual({ enabled: false });
    expect((await post({ facts })).status).toBe(503);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns a checked reply', async () => {
    mockCreate.mockResolvedValue(answer('Got it — online sessions only. 8 psychologists fit, and Alice is first.'));
    const r = await post({ facts });
    expect(await r.json()).toEqual({ reply: 'Got it — online sessions only. 8 psychologists fit, and Alice is first.' });
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ model: 'claude-opus-5', fallbacks: 'default' });
  });

  it('503s (template kept) when the reply breaks a rule or Claude declines', async () => {
    mockCreate.mockResolvedValueOnce(answer('Alice is perfect! 8 fit.'));
    expect((await post({ facts })).status).toBe(503);
    mockCreate.mockResolvedValueOnce(answer('', 'refusal'));
    expect((await post({ facts })).status).toBe(503);
  });

  it('rejects malformed facts', async () => {
    expect((await post({ facts: { ...facts, count: 0 } })).status).toBe(400);
    expect((await post({ facts: { ...facts, changes: 'x' } })).status).toBe(400);
  });
});

describe('where wording is allowed', () => {
  const start = core.demoResults('psych-masking');

  it('a "Done" reply carries its facts, and rewording replaces only its text', () => {
    const t = core.refine(start, 'Online only');
    const last = t.state.chat!.at(-1)!;
    expect(last.facts).toMatchObject({ changes: ['online sessions only'], noun: 'psychologists' });
    const s = core.rewordLast(t.state, 'Online only now. 11 psychologists fit, and Jess is first.');
    expect(s.chat!.at(-1)).toMatchObject({ text: 'Online only now. 11 psychologists fit, and Jess is first.', action: 'see_matches' });
    expect(s.chat!.at(-1)!.facts).toBeUndefined();
    expect(s.result).toBe(t.state.result);
  });

  it('medical questions never carry facts, so Claude never words them', () => {
    for (const p of redteam.advice) expect(core.refine(start, p).state.chat!.at(-1)!.facts).toBeUndefined();
    expect(core.refine(start, 'Should I up my dose? Also online only.').state.chat!.at(-1)!.facts).toBeUndefined();
  });
});
