import { underLimit } from '../server/guard';
import { handle, PROTOCOL_VERSION } from '../server/mcp';

// POST /api/mcp → WATL's MCP server (streamable HTTP, JSON responses, no sessions). Add this URL as
// a custom connector in Claude or ChatGPT. Any origin may call it (assistants call from their own
// servers); it spends nothing, stores nothing and is rate-limited like the other endpoints.

const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', 'mcp-protocol-version': PROTOCOL_VERSION };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

export async function POST(request: Request) {
  if (!underLimit(request)) return json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Busy, try again shortly' } }, 429);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }
  if (Array.isArray(body)) {
    const out = body.slice(0, 20).map((m) => handle(m)).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202, headers });
  }
  const out = handle(body as Parameters<typeof handle>[0]);
  return out ? json(out) : new Response(null, { status: 202, headers });
}

/** No server-to-client stream: this server only answers requests. */
export function GET() {
  return new Response('WATL MCP server. POST JSON-RPC here.', { status: 405, headers: { allow: 'POST', 'content-type': 'text/plain' } });
}
