import { strongestLayer } from './score';
import type { Scored } from './types';

// Top-3 selection (PRD §31, §43). Slot 1 is always the best overall fit. Later slots may prefer
// a clinician who fits for a different reason, but only among near-ties with the same fit label,
// so variety never costs quality. Fewer than 3 valid clinicians → return fewer; never pad.

/** Two clinicians this close on total score (and with the same fit label) count as a near-tie. */
export const NEAR_TIE = 0.04;

export function selectTop(ranked: Scored[], k = 3): Scored[] {
  const pool = ranked.filter((x) => x.fit !== null);
  const picked: Scored[] = [];
  while (picked.length < k && pool.length > 0) {
    const next = pool[0];
    const window = pool.filter((x) => x.fit === next.fit && next.total - x.total <= NEAR_TIE);
    const covered = new Set(picked.map(strongestLayer));
    const choice = picked.length > 0 ? (window.find((x) => !covered.has(strongestLayer(x))) ?? next) : next;
    picked.push(choice);
    pool.splice(pool.indexOf(choice), 1);
  }
  return picked;
}
