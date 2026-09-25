import { professionals } from '../server/data/professionals';
import { decide, recommend } from '../server/engine';
import type { ClinicianRecord } from '../server/engine/types';

import { demos } from '@/features/match/demos';

// The engine at directory scale: 1,000 clinicians (the 14 real profiles, re-identified and shuffled
// across locations and fees). Matching runs on the phone, so it has to stay fast there too.

const POOL: ClinicianRecord[] = Array.from({ length: 1000 }, (_, i) => {
  const c = professionals[i % professionals.length];
  const jitter = (n: number) => ((i * 7919) % 100) / 100 - 0.5 + n;
  return {
    ...c,
    id: `${c.id}-${i}`,
    location: { ...c.location, lat: c.location.lat === null ? null : jitter(c.location.lat), lng: c.location.lng === null ? null : jitter(c.location.lng) },
    practical: { ...c.practical, gapAfterMedicare: c.practical.gapAfterMedicare === null ? null : (i * 37) % 200 },
  };
});

describe('engine at 1,000 clinicians', () => {
  const signals = demos.filter((d) => d.profession !== 'either').map((d) => ({ ...d.signals, profession: d.profession === 'either' ? undefined : d.profession }));

  it('recommends and decides fast enough to run on a phone', () => {
    recommend(signals[0], POOL); // warm up
    const t0 = performance.now();
    for (const s of signals) {
      recommend(s, POOL);
      decide(s, POOL, { asked: [], preferencesConfirmed: false });
    }
    const perTurn = (performance.now() - t0) / signals.length;
    console.log(`engine: ${perTurn.toFixed(1)} ms per turn at ${POOL.length} clinicians`);
    // Generous for slow CI machines; the PRD budget for a whole turn is 3 s.
    expect(perTurn).toBeLessThan(750);
  });

  it('still returns everyone eligible, with three featured', () => {
    const r = recommend(signals[0], POOL);
    if (r.status !== 'matches') throw new Error('expected matches');
    expect(r.matches).toHaveLength(3);
    expect(new Set([...r.matches, ...r.more].map((m) => m.clinicianId)).size).toBe(r.matches.length + r.more.length);
  });
});
