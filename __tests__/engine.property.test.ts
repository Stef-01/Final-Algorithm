import { professionals } from '../server/data/professionals';
import { decide, recommend } from '../server/engine';
import { eligibleFor, failures } from '../server/engine/eligibility';
import { copyProblems } from '../server/engine/explain';
import { isUsableStatus } from '../server/engine/score';
import { CONFIDENCE, DIMENSIONS, type ClinicianRecord, type Confidence, type Dimension, type PatientSignals } from '../server/engine/types';
import { fixtureClinicians } from '../server/fixtures/clinicians';
import { QUESTIONS } from '../server/questions';

// Randomised checks of the engine's guarantees over many generated patients (seeded, so
// failures reproduce). Each case prints its seed on failure.

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AREAS = [
  'ADHD', 'Adult ADHD', 'ADHD assessment', 'Autism', 'Anxiety', 'Depression', 'Trauma', 'Burnout', 'Stress', 'Sleep',
  'Mental health', "Women's health", 'Career and performance', 'Chronic pain', 'Young people', 'Neurodivergent adults',
];
const CONFS: Confidence[] = ['low', 'medium', 'high'];
const DIMS = Object.keys(DIMENSIONS) as Dimension[];

function randomSignals(rand: () => number): PatientSignals {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const chance = (p: number) => rand() < p;
  const clinicalNeeds = AREAS.filter(() => chance(0.15)).map((area) => ({ area, confidence: pick(CONFS) }));
  const preferences: PatientSignals['preferences'] = {};
  for (const d of DIMS) if (chance(0.25)) preferences[d] = { value: pick(DIMENSIONS[d] as readonly string[]), confidence: pick(CONFS) };
  const constraints: PatientSignals['constraints'] = {};
  if (chance(0.3)) constraints.maxGap = pick([0, 50, 120, null]);
  if (chance(0.3)) constraints.mode = pick(['any', 'in_person_only', 'telehealth_only'] as const);
  if (chance(0.15)) constraints.needsWeekend = chance(0.5);
  if (chance(0.1)) constraints.clinicianGender = pick(['female', 'male'] as const);
  if (chance(0.4)) constraints.age = 16 + Math.floor(rand() * 50);
  if (chance(0.25)) {
    constraints.origin = pick([
      { lat: -27.46, lng: 153.03 },
      { lat: -28.0, lng: 153.4 },
      { lat: -33.87, lng: 151.2 },
    ]);
    constraints.maxKm = pick([2, 10, 30, 100]);
  }
  return {
    profession: pick([undefined, 'gp', 'psychologist'] as const),
    clinicalNeeds,
    preferences,
    constraints,
    complexity: pick([undefined, 'single', 'multiple', 'complex'] as const),
    safetyFlag: chance(0.03) ? { level: 'urgent', reason: 'test' } : undefined,
  };
}

const POOLS: [string, ClinicianRecord[]][] = [
  ['ADHDme network', professionals],
  ['fictional fixtures', fixtureClinicians],
];
const CASES = 750;

describe.each(POOLS)('engine guarantees over %s', (_name, pool) => {
  const byId = new Map(pool.map((c) => [c.id, c]));

  it(`holds for ${CASES} random patients`, () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const rand = prng(seed);
      const s = randomSignals(rand);
      const where = `seed ${seed}`;
      const eligible = eligibleFor(pool, s).map((c) => c.id);
      const r = recommend(s, pool);

      if (eligible.length === 0) {
        expect({ where, status: r.status }).toEqual({ where, status: 'none' });
        continue;
      }
      if (r.status !== 'matches') throw new Error(`${where}: expected matches`);
      const all = [...r.matches, ...r.more];
      const ids = all.map((m) => m.clinicianId);

      // Exactly the eligible clinicians, once each; at most three featured.
      expect({ where, n: ids.length, unique: new Set(ids).size }).toEqual({ where, n: eligible.length, unique: eligible.length });
      expect(new Set(ids)).toEqual(new Set(eligible));
      expect(r.matches.length).toBe(Math.min(3, eligible.length));

      // Explained, better-than-possible fits always come before anyone unexplained.
      const firstUnexplained = all.findIndex((m) => m.reasons.length === 0);
      if (firstUnexplained >= 0) {
        expect({ where, ok: all.slice(firstUnexplained).every((m) => m.fit === 'Possible fit') }).toEqual({ where, ok: true });
      }

      for (const m of all) {
        const c = byId.get(m.clinicianId)!;
        // Known requirements and the profession are never violated.
        expect({ where, id: c.id, failures: failures(c, s.constraints, s.profession) }).toEqual({ where, id: c.id, failures: [] });
        if (m.reasons.length === 0) expect(m.fit).toBe('Possible fit');
        expect(m.reasons.length).toBeLessThanOrEqual(3);
        for (const reason of m.reasons) {
          const ev = c.evidence.find((e) => e.id === reason.evidenceId);
          expect(ev && isUsableStatus(ev.reviewerStatus) && CONFIDENCE[ev.confidence] >= CONFIDENCE.medium).toBe(true);
          expect(reason.evidence).toBe(ev!.patientFacing);
          expect(copyProblems(`${reason.signal} ${reason.evidence}`)).toEqual([]);
        }
      }

      // Nothing internal leaks.
      expect(JSON.stringify(r)).not.toMatch(/"total"|"layers"|"excerpt"/);
    }
  });

  it(`asks sensibly for ${CASES} random patients`, () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const rand = prng(seed * 7919);
      const s = randomSignals(rand);
      const asked = QUESTIONS.filter(() => rand() < 0.25).map((q) => q.id);
      const d = decide(s, pool, { asked, preferencesConfirmed: rand() < 0.5 });
      if (s.safetyFlag?.level === 'urgent') {
        expect(d.type).toBe('safety');
        continue;
      }
      if (d.type === 'ask') {
        expect(asked).not.toContain(d.question.id);
        expect(asked.length).toBeLessThan(4);
        if (s.profession && d.question.professions) expect(d.question.professions).toContain(s.profession);
      }
      if (asked.length >= 4) expect(d.type).not.toBe('ask');
    }
  });
});
