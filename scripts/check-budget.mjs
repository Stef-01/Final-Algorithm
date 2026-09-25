// Performance budget for the web build (docs/PLAN.md Phase 7). Run after `npx expo export --platform web`.
// Fails CI when the app grows past what a patient on a phone connection should have to download.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = {
  jsGzipKB: 450, // all JavaScript, gzipped
  imageKB: 160, // any single image
  totalMB: 4, // everything in dist/
};

const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
const all = files('dist');
const kb = (n) => Math.round(n / 1024);

const js = all.filter((f) => f.endsWith('.js')).reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0);
const images = all.filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f)).map((f) => [f, statSync(f).size]);
const total = all.reduce((n, f) => n + statSync(f).size, 0);

const problems = [];
if (kb(js) > BUDGET.jsGzipKB) problems.push(`JavaScript is ${kb(js)} KB gzipped (budget ${BUDGET.jsGzipKB} KB)`);
for (const [f, size] of images) if (kb(size) > BUDGET.imageKB) problems.push(`${f} is ${kb(size)} KB (budget ${BUDGET.imageKB} KB)`);
if (total / 1024 / 1024 > BUDGET.totalMB) problems.push(`dist is ${(total / 1024 / 1024).toFixed(1)} MB (budget ${BUDGET.totalMB} MB)`);

console.log(`JS ${kb(js)} KB gzipped · largest image ${kb(Math.max(0, ...images.map(([, s]) => s)))} KB · total ${(total / 1024 / 1024).toFixed(1)} MB`);
if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log('✓ within budget');
