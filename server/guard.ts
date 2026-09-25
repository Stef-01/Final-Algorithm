// Guards for the endpoints that spend money (Claude). Once ANTHROPIC_API_KEY is set, anyone who
// finds the URL could otherwise run up the bill.
// - Origin: browsers send it on cross-site requests and scripts on other sites can't fake it, so only
//   WATL's own pages (and localhost while developing) are accepted. Native apps send none; set
//   WATL_ALLOW_NO_ORIGIN=1 if they need Claude.
// - Rate: a per-visitor cap far above what a patient uses (a search is a handful of messages).
//   In memory, per function instance: it limits bursts, not a determined attacker, so keep an
//   Anthropic spend limit on the key as well.

const WINDOW_MS = 10 * 60 * 1000;
export const MAX_PER_WINDOW = 40;

const hits = new Map<string, number[]>();

export function allowedOrigin(request: Request, env: Record<string, string | undefined> = process.env): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return env.WATL_ALLOW_NO_ORIGIN === '1';
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const own = new URL(request.url).host;
  const extra = (env.WATL_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return host === own || /^localhost(:\d+)?$/.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host) || extra.includes(host);
}

/** Whether this visitor may make another request now (and records it). */
export function underLimit(request: Request, now = Date.now()): boolean {
  const who = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const recent = (hits.get(who) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(who, recent);
    return false;
  }
  recent.push(now);
  hits.set(who, recent);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return true;
}

/** For tests. */
export function resetLimits() {
  hits.clear();
}
