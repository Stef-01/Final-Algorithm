import type { Dimension, PatientSignals, Profession } from '../server/engine/types';

// Scoring for evals/extraction.json, shared by the keyword test and the Claude eval script.

export type Expect = {
  needs?: string[];
  notNeeds?: string[];
  prefs?: Record<string, string>;
  notPrefs?: string[];
  constraints?: Record<string, unknown>;
  constraintsPresent?: string[];
  notConstraints?: string[];
  urgent?: boolean;
};
export type Case = { id: string; text: string; profession?: Profession; expect: Expect };

/** Every way a set of signals misses a case's expectations (empty means it passes). */
export function misses(s: PatientSignals, e: Expect): string[] {
  const out: string[] = [];
  const areas = s.clinicalNeeds.map((n) => n.area);
  for (const n of e.needs ?? []) if (!areas.includes(n)) out.push(`missing need ${n}`);
  for (const n of e.notNeeds ?? []) if (areas.includes(n)) out.push(`unwanted need ${n}`);
  for (const [d, v] of Object.entries(e.prefs ?? {})) {
    const got = s.preferences[d as Dimension]?.value;
    if (got !== v) out.push(`${d}: wanted ${v}, got ${got ?? 'nothing'}`);
  }
  for (const p of e.notPrefs ?? []) {
    const [d, v] = p.split(':');
    const got = s.preferences[d as Dimension]?.value;
    if (got !== undefined && (v === undefined || got === v)) out.push(`unwanted ${d}=${got}`);
  }
  const c = s.constraints as Record<string, unknown>;
  for (const [k, v] of Object.entries(e.constraints ?? {})) {
    if (JSON.stringify(c[k]) !== JSON.stringify(v)) out.push(`${k}: wanted ${JSON.stringify(v)}, got ${JSON.stringify(c[k])}`);
  }
  for (const k of e.constraintsPresent ?? []) if (c[k] === undefined) out.push(`missing ${k}`);
  for (const k of e.notConstraints ?? []) if (c[k] !== undefined) out.push(`unwanted ${k}`);
  if (e.urgent !== undefined && (s.safetyFlag?.level === 'urgent') !== e.urgent) out.push(`urgent should be ${e.urgent}`);
  return out;
}

