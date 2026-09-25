import cases from '../evals/extraction.json';
import { misses, type Case } from '../evals/score';

import { extractSignals } from '@/features/match/extract';

// Extraction eval (docs/PLAN.md Phase 8). The same cases score the Claude extractor later;
// the keyword stand-in has to pass all of them today.

describe('extraction eval: keyword stand-in', () => {
  it('has a broad set of cases', () => {
    expect(cases.cases.length).toBeGreaterThanOrEqual(30);
    expect(new Set(cases.cases.map((c) => c.id)).size).toBe(cases.cases.length);
  });

  it.each((cases.cases as Case[]).map((c) => [c.id, c]))('%s', (_id, c) => {
    expect(misses(extractSignals(c.text, c.profession), c.expect)).toEqual([]);
  });
});
