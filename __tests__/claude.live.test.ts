/**
 * @jest-environment node
 */
// Live extraction eval against the real Claude API. Skipped unless WATL_LIVE_EVAL=1, because it
// spends money (~35 short requests). Run with:
//   WATL_LIVE_EVAL=1 ANTHROPIC_API_KEY=... npx jest claude.live
import Anthropic from '@anthropic-ai/sdk';

import cases from '../evals/extraction.json';
import { misses, type Case } from '../evals/score';
import { extractWithClaude } from '../server/claude/extract';
import { writeReply } from '../server/claude/reply';

import * as core from '@/features/match/sessionCore';
import { refineSuggestions } from '@/features/match/refine';

import { extractSignals, withKeywordExtras } from '@/features/match/extract';

const live = process.env.WATL_LIVE_EVAL === '1' ? describe : describe.skip;
/** Share of cases that must pass. Claude reads more than keywords do, so it's held to a high bar. */
const PASS_RATE = 0.9;

live('extraction eval: Claude', () => {
  it(
    `passes at least ${PASS_RATE * 100}% of evals/extraction.json`,
    async () => {
      const client = new Anthropic();
      const results = await Promise.all(
        (cases.cases as Case[]).map(async (c) => {
          const { signals } = await extractWithClaude(client, c.text, c.profession);
          // As in the app: places, languages and urgent wording also come from the keyword rules.
          const s = withKeywordExtras(signals, extractSignals(c.text, c.profession));
          return { id: c.id, problems: misses(s, c.expect) };
        }),
      );
      const failed = results.filter((r) => r.problems.length > 0);
      for (const f of failed) console.log(`${f.id}: ${f.problems.join('; ')}`);
      console.log(`Claude extraction: ${results.length - failed.length}/${results.length} passed`);
      expect((results.length - failed.length) / results.length).toBeGreaterThanOrEqual(PASS_RATE);
    },
    120_000,
  );

  it(
    'words assistant replies within the rules at least 80% of the time (else the template shows)',
    async () => {
      const client = new Anthropic();
      const start = core.demoResults('psych-masking');
      const facts = refineSuggestions('psychologist')
        .map((chip) => core.refine(start, chip).state.chat!.at(-1)!.facts)
        .filter((f) => f !== undefined);
      const replies = await Promise.all(facts.map((f) => writeReply(client, f)));
      replies.forEach((r, i) => console.log(`${facts[i].changes.join(', ') || facts[i].switched}: ${r ?? '(template kept)'}`));
      expect(replies.filter(Boolean).length / replies.length).toBeGreaterThanOrEqual(0.8);
    },
    120_000,
  );
});
