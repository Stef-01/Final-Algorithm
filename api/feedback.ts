import { parseFeedback, toRecord } from '../server/feedback';
import { allowedOrigin, underLimit } from '../server/guard';

// POST /api/feedback → stores one rating in Upstash Redis (Vercel Marketplace), list `watl:feedback`.
// Without a store connected it accepts and drops the feedback (202), so the app never waits on it.
// Upstash's Vercel integration sets KV_REST_API_URL / KV_REST_API_TOKEN.

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
  const feedback = parseFeedback(body);
  if (!feedback) return json({ error: 'bad request' }, 400);

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return json({ stored: false }, 202);

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(['LPUSH', 'watl:feedback', JSON.stringify(toRecord(feedback))]),
      signal: AbortSignal.timeout(4000),
    });
    return json({ stored: r.ok }, r.ok ? 200 : 202);
  } catch {
    return json({ stored: false }, 202);
  }
}
