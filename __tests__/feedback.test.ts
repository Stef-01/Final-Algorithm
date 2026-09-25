/**
 * @jest-environment node
 */
import { POST } from '../api/feedback';
import { parseFeedback, toRecord } from '../server/feedback';

import { demoById } from '@/features/match/demos';
import { feedbackBody } from '@/features/match/sendFeedback';
import * as core from '@/features/match/sessionCore';

const post = (body: unknown, origin = 'http://x') =>
  POST(new Request('http://x/api/feedback', { method: 'POST', headers: { origin }, body: JSON.stringify(body) }));
const good = { rating: 4, matches: 12, followups: 1, seconds: 40, profession: 'psychologist', claude: false, thumbs: { 'alice-bui': 'up' } };

describe('feedback storage (PRD §49)', () => {
  const env = process.env;
  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it('keeps numbers and ids, drops anything else', () => {
    expect(parseFeedback({ ...good, note: 'I have ADHD and anxiety', thumbs: { 'alice-bui': 'up', 'Robert; DROP': 'up', x: 'meh' } })).toEqual({
      ...good,
      thumbs: { 'alice-bui': 'up' },
    });
    expect(parseFeedback({ ...good, rating: 7 })).toBeNull();
    expect(parseFeedback({ ...good, profession: 'dentist' })).toBeNull();
    expect(toRecord(parseFeedback(good)!, new Date('2026-09-25T13:45:00Z')).day).toBe('2026-09-25');
  });

  it('after a 5 or a 1–2, keeps known reasons and a short note; ignores them for a 3–4', () => {
    const why = { reasons: ['clear_why', 'too_far', 'clear_why', 'x'], note: '  Loved   the   fee line  ' };
    expect(parseFeedback({ ...good, rating: 5, why })!.why).toEqual({ reasons: ['clear_why'], note: 'Loved the fee line' });
    expect(parseFeedback({ ...good, rating: 1, why })!.why).toEqual({ reasons: ['too_far'], note: 'Loved the fee line' });
    expect(parseFeedback({ ...good, rating: 4, why })!.why).toBeUndefined();
    expect(parseFeedback({ ...good, rating: 2, why: { note: 'x'.repeat(900) } })!.why!.note).toHaveLength(300);
    expect(parseFeedback({ ...good, rating: 5, why: { reasons: [] } })!.why).toBeUndefined();
    const s = core.rateMatches(core.demoResults('psych-masking'), 5, { reasons: ['got_it'], note: 'Quick' });
    expect(parseFeedback(feedbackBody(s))!.why).toEqual({ reasons: ['got_it'], note: 'Quick' });
    expect(core.rateMatches(s, 3).feedback.why).toBeUndefined();
  });

  it('what the app sends contains nothing the patient wrote', () => {
    let s = core.demoResults('psych-masking');
    s = core.thumb(core.rateMatches(s, 5), 'jessica-katsamatsas', 'up');
    const body = feedbackBody(s);
    expect(parseFeedback(body)).not.toBeNull();
    const words = demoById('psych-masking')!.text.toLowerCase().match(/[a-z']{5,}/g)!;
    const sent = JSON.stringify(body).toLowerCase();
    for (const w of words) expect(sent).not.toContain(`"${w}`);
  });

  it('accepts and drops feedback when no store is connected', async () => {
    process.env = { ...env, KV_REST_API_URL: '', KV_REST_API_TOKEN: '' };
    const r = await post(good);
    expect(r.status).toBe(202);
    expect(await r.json()).toEqual({ stored: false });
    expect((await post({ rating: 'five' })).status).toBe(400);
    expect((await post(good, 'https://evil.example')).status).toBe(403);
  });

  it('pushes one record to Upstash when connected', async () => {
    process.env = { ...env, KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 't' };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{"result":1}', { status: 200 }));
    const r = await post(good);
    expect(await r.json()).toEqual({ stored: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://kv.example/pipeline');
    const [[cmd, key, value], trim] = JSON.parse(init.body as string);
    expect([cmd, key]).toEqual(['LPUSH', 'watl:feedback']);
    expect(JSON.parse(value)).toMatchObject({ rating: 4, thumbs: { 'alice-bui': 'up' } });
    // The list is bounded until a retention period is chosen.
    expect(trim).toEqual(['LTRIM', 'watl:feedback', '0', '4999']);
  });
});
