import { allowedOrigin, underLimit } from '../server/guard';
import { parseSubmission, toInterviewDraft } from '../server/portal';

// POST /api/portal → queues a "Join WATL" submission for review, as a draft interview file, on the
// Upstash list `watl:portal`. Without a store connected it validates and returns 202 (not kept).
// It stores a professional's contact email, which is theirs to give; see docs/privacy.md.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!underLimit(request)) return json({ error: 'busy' }, 429);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  const parsed = parseSubmission(body);
  if ('problems' in parsed) return json({ problems: parsed.problems }, 400);

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return json({ queued: false }, 202);
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify([
        ['LPUSH', 'watl:portal', JSON.stringify(toInterviewDraft(parsed.submission))],
        ['LTRIM', 'watl:portal', '0', '999'],
      ]),
      signal: AbortSignal.timeout(4000),
    });
    return json({ queued: r.ok }, r.ok ? 200 : 202);
  } catch {
    return json({ queued: false }, 202);
  }
}
