import Anthropic from '@anthropic-ai/sdk';

import { extractWithClaude, ExtractionUnavailable, MAX_CHARS } from '../server/claude/extract';
import { PROFESSIONS, type Profession } from '../server/engine/types';

// POST /api/extract {text, profession?} → {signals, relax}. GET → {enabled}.
// 503 whenever Claude isn't available (no key, timeout, refusal), so the app falls back to its
// keyword extractor. Nothing the patient wrote is logged or stored here (PRD §45).

const enabled = () => !!process.env.ANTHROPIC_API_KEY && process.env.WATL_CLAUDE !== 'off';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export function GET() {
  return json({ enabled: enabled() });
}

export async function POST(request: Request) {
  if (!enabled()) return json({ error: 'unavailable' }, 503);
  let body: { text?: unknown; profession?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > MAX_CHARS) return json({ error: 'bad request' }, 400);
  const profession = (PROFESSIONS as readonly unknown[]).includes(body.profession) ? (body.profession as Profession) : undefined;

  try {
    const client = new Anthropic({ timeout: 8000, maxRetries: 1 });
    return json(await extractWithClaude(client, text, profession));
  } catch (error) {
    // Rate limits, timeouts, refusals, bad output: all mean "use the keyword extractor this time".
    const reason = error instanceof ExtractionUnavailable ? error.message : error instanceof Anthropic.APIError ? `api ${error.status}` : 'error';
    console.warn(`extract unavailable: ${reason}`); // never the patient's text
    return json({ error: 'unavailable' }, 503);
  }
}
