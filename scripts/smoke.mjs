// Smoke test for a deployed WATL: the page, a deep link, the manifest, and each API's guards.
// Usage: node scripts/smoke.mjs https://final-algorithm.vercel.app
// Run by .github/workflows/smoke.yml after every production deployment.

const base = (process.argv[2] ?? process.env.SMOKE_URL ?? '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node scripts/smoke.mjs <url>');
  process.exit(2);
}
const origin = new URL(base).origin;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failures.push(name);
    console.error(`✗ ${name}: ${e.message}`);
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const post = (path, body, headers = {}) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

await check('home page serves the app', async () => {
  const r = await fetch(`${base}/`);
  const html = await r.text();
  expect(r.ok, `status ${r.status}`);
  expect(/<title>WATL/.test(html), 'no WATL title');
  expect(/_expo\/static\/js\/web\/entry-.*\.js/.test(html), 'no app bundle');
  expect(/noindex/.test(html), 'noindex missing during testing');
});

await check('deep links fall back to the app', async () => {
  const r = await fetch(`${base}/clinician/alice-bui`);
  expect(r.ok && /<div id="root">/.test(await r.text()), `status ${r.status}`);
});

await check('manifest is served', async () => {
  const r = await fetch(`${base}/manifest.webmanifest`);
  expect(r.ok && (await r.json()).name === 'WATL', `status ${r.status}`);
});

await check('/api/extract answers (not swallowed by the SPA rewrite)', async () => {
  const r = await fetch(`${base}/api/extract`);
  const body = await r.json();
  expect(typeof body.enabled === 'boolean', 'no enabled flag');
});

await check('/api/reply answers', async () => {
  const body = await (await fetch(`${base}/api/reply`)).json();
  expect(typeof body.enabled === 'boolean', 'no enabled flag');
});

const rating = { rating: 4, matches: 3, followups: 1, seconds: 30, profession: 'gp', thumbs: {} };
await check('/api/feedback refuses other sites', async () => {
  const r = await post('/api/feedback', rating, { origin: 'https://evil.example' });
  expect(r.status === 403, `status ${r.status}`);
});

// An invalid rating from WATL's own origin: gets past the guard to validation (400), and is never
// stored, so smoke runs don't put fake ratings into the testing data.
await check('/api/feedback lets WATL through to validation', async () => {
  const r = await post('/api/feedback', { ...rating, rating: 0 }, { origin });
  expect(r.status === 400, `status ${r.status}`);
});

// Invalid on purpose (no consent): proves the portal validates, and never queues a fake submission.
await check('/api/portal validates and refuses without consent', async () => {
  const r = await post('/api/portal', { name: 'Smoke test' }, { origin });
  const body = await r.json();
  expect(r.status === 400 && body.problems.includes('consent'), `status ${r.status}`);
});

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed on ${base}`);
  process.exit(1);
}
console.log(`\nAll checks passed on ${base}`);
