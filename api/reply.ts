import Anthropic from '@anthropic-ai/sdk';

import { writeReply, type ReplyFacts } from '../server/claude/reply';
import { allowedOrigin, underLimit } from '../server/guard';

// POST /api/reply {facts} → {reply}. Off unless ANTHROPIC_API_KEY is set and WATL_CLAUDE_REPLIES=on.
// 503 whenever there's no usable reply, and the app keeps its own template.

const enabled = () => !!process.env.ANTHROPIC_API_KEY && process.env.WATL_CLAUDE_REPLIES === 'on' && process.env.WATL_CLAUDE !== 'off';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const isFacts = (x: unknown): x is ReplyFacts => {
  const f = x as ReplyFacts;
  return (
    !!f &&
    typeof f.said === 'string' &&
    f.said.length <= 2000 &&
    Array.isArray(f.changes) &&
    f.changes.length <= 10 &&
    f.changes.every((c) => typeof c === 'string' && c.length <= 80) &&
    (f.switched === undefined || (typeof f.switched === 'string' && f.switched.length <= 60)) &&
    Number.isInteger(f.count) &&
    f.count >= 1 &&
    f.count <= 500 &&
    typeof f.noun === 'string' &&
    f.noun.length <= 20 &&
    typeof f.first === 'string' &&
    f.first.length <= 40
  );
};

export function GET() {
  return json({ enabled: enabled() });
}

export async function POST(request: Request) {
  if (!enabled()) return json({ error: 'unavailable' }, 503);
  if (!allowedOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!underLimit(request)) return json({ error: 'busy' }, 429);
  let facts: unknown;
  try {
    facts = ((await request.json()) as { facts?: unknown }).facts;
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  if (!isFacts(facts)) return json({ error: 'bad request' }, 400);
  try {
    const reply = await writeReply(new Anthropic({ timeout: 6000, maxRetries: 0 }), facts);
    return reply ? json({ reply }) : json({ error: 'unavailable' }, 503);
  } catch (error) {
    console.warn(`reply unavailable: ${error instanceof Anthropic.APIError ? `api ${error.status}` : 'error'}`); // never the text
    return json({ error: 'unavailable' }, 503);
  }
}
