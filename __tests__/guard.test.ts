/**
 * @jest-environment node
 */
import { allowedOrigin, MAX_PER_WINDOW, resetLimits, underLimit } from '../server/guard';

const req = (headers: Record<string, string>) => new Request('https://final-algorithm.vercel.app/api/extract', { method: 'POST', headers });

describe('guards on the endpoints that spend money', () => {
  beforeEach(() => resetLimits());

  it("accepts WATL's own pages and local development only", () => {
    expect(allowedOrigin(req({ origin: 'https://final-algorithm.vercel.app' }), {})).toBe(true);
    expect(allowedOrigin(req({ origin: 'http://localhost:8081' }), {})).toBe(true);
    expect(allowedOrigin(req({ origin: 'https://evil.example' }), {})).toBe(false);
    expect(allowedOrigin(req({ origin: 'null' }), {})).toBe(false);
    expect(allowedOrigin(req({ origin: 'https://preview.example' }), { WATL_ALLOWED_ORIGINS: 'preview.example' })).toBe(true);
  });

  it('rejects requests with no origin unless native apps are allowed', () => {
    expect(allowedOrigin(req({}), {})).toBe(false);
    expect(allowedOrigin(req({}), { WATL_ALLOW_NO_ORIGIN: '1' })).toBe(true);
  });

  it('caps each visitor, and lets them back after the window', () => {
    const a = req({ 'x-forwarded-for': '203.0.113.7' });
    const b = req({ 'x-forwarded-for': '198.51.100.2' });
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_PER_WINDOW; i++) expect(underLimit(a, t0 + i)).toBe(true);
    expect(underLimit(a, t0 + MAX_PER_WINDOW)).toBe(false);
    expect(underLimit(b, t0 + MAX_PER_WINDOW)).toBe(true);
    expect(underLimit(a, t0 + 11 * 60 * 1000)).toBe(true);
  });
});
