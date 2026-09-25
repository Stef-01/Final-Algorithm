import { parseFeedback, parsePractitionerRating, toRecord } from '../server/feedback';
import { allowedOrigin, underLimit } from '../server/guard';

// POST /api/feedback → stores one rating in Upstash Redis (Vercel Marketplace), list `watl:feedback`
// (match ratings) or `watl:practitioner` (care-team ratings, `kind: 'practitioner'`),
// keeping only the newest MAX_KEPT so the list can't grow without limit (retention: docs/privacy.md).
// Without a store connected it accepts and drops the feedback (202), so the app never waits on it.
// Upstash's Vercel integration sets KV_REST_API_URL / KV_REST_API_TOKEN.

export const MAX_KEPT = 5000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(request: Request) {
  // Keep junk out of the testing data: only WATL's own pages, at a human rate.
  if (!allowedOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!underLimit(request)) return json({ error: 'busy' }, 429);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  const practitioner = parsePractitionerRating(body);
  const feedback = practitioner ? null : parseFeedback(body);
  if (!practitioner && !feedback) return json({ error: 'bad request' }, 400);
  const list = practitioner ? 'watl:practitioner' : 'watl:feedback';
  const record = practitioner ? { ...practitioner, day: new Date().toISOString().slice(0, 10) } : toRecord(feedback!);

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return json({ stored: false }, 202);

  try {
    // One round trip: push the rating, then trim to the newest MAX_KEPT (Upstash REST pipeline).
    const r = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify([
        ['LPUSH', list, JSON.stringify(record)],
        ['LTRIM', list, '0', String(MAX_KEPT - 1)],
      ]),
      signal: AbortSignal.timeout(4000),
    });
    return json({ stored: r.ok }, r.ok ? 200 : 202);
  } catch {
    return json({ stored: false }, 202);
  }
}
