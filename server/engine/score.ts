import { distanceKm } from './eligibility';
import {
  CONFIDENCE,
  DIMENSIONS,
  type ClinicianRecord,
  type Dimension,
  type FitLabel,
  type Layer,
  type PatientSignals,
  type Scored,
} from './types';

// Layers 2–4 (PRD §21). All scores are 0..1 and never shown to patients (PRD §4.6).

/** How much each practice dimension matters when the patient has a preference. */
export const IMPORTANCE: Record<Dimension, number> = {
  consultation_pace: 1,
  shared_decision_making: 0.9,
  mental_health_integration: 0.9,
  explanation_depth: 0.8,
  communication_directness: 0.7,
  medication_philosophy: 0.7,
  diagnostic_style: 0.6,
  lifestyle_integration: 0.6,
  care_coordination: 0.6,
  patient_autonomy: 0.6,
  continuity: 0.5,
  follow_up_intensity: 0.5,
  uncertainty_tolerance: 0.4,
};

export const LAYER_WEIGHT: Record<Layer, number> = { clinical: 0.35, practice: 0.5, practical: 0.15 };

/** Fit-label thresholds on the total score; tuned on the seed data (server/data). */
export const FIT_THRESHOLDS: [FitLabel, number][] = [
  ['Strong fit', 0.74],
  ['Good fit', 0.62],
  ['Worth considering', 0.52],
];

export const fitFor = (total: number): FitLabel | null => FIT_THRESHOLDS.find(([, t]) => total >= t)?.[0] ?? null;

/** Only reviewed traits at medium confidence or above may influence ranking or explanations (PRD §26). */
export function usableTrait(c: ClinicianRecord, d: Dimension) {
  const t = c.phenotype[d];
  if (!t || CONFIDENCE[t.confidence] < CONFIDENCE.medium) return undefined;
  const approved = t.evidenceIds.some((id) =>
    c.evidence.some((e) => e.id === id && e.reviewerStatus === 'approved' && CONFIDENCE[e.confidence] >= CONFIDENCE.medium),
  );
  return approved ? t : undefined;
}

/** Similarity of two positions on a dimension's ordered scale: 1 = same, 0 = opposite ends. */
export function similarity(d: Dimension, a: string, b: string) {
  const scale = DIMENSIONS[d] as readonly string[];
  const i = scale.indexOf(a);
  const j = scale.indexOf(b);
  if (i < 0 || j < 0) return 0.5;
  return 1 - Math.abs(i - j) / (scale.length - 1);
}

const norm = (s: string) => s.trim().toLowerCase();

export function expertiseLevel(c: ClinicianRecord, area: string) {
  const e = c.expertise.find((x) => norm(x.area) === norm(area));
  if (!e) return 0;
  const approved = e.evidenceIds.some((id) => c.evidence.some((ev) => ev.id === id && ev.reviewerStatus === 'approved'));
  if (!approved) return 0;
  return e.level === 'particular' ? 1 : 0.5;
}

/** Layer 2: condition expertise, weighted by how sure we are about each need. */
export function clinicalScore(c: ClinicianRecord, s: PatientSignals) {
  if (s.clinicalNeeds.length === 0) return 0.5;
  let num = 0;
  let den = 0;
  for (const n of s.clinicalNeeds) {
    const w = CONFIDENCE[n.confidence];
    num += w * expertiseLevel(c, n.area);
    den += w;
  }
  const base = num / den;
  // Complex, overlapping needs favour clinicians who integrate care.
  if (s.complexity === 'complex' || s.complexity === 'multiple') {
    const integ = usableTrait(c, 'mental_health_integration');
    const bonus = integ ? similarity('mental_health_integration', integ.value, 'high') : 0.5;
    return 0.8 * base + 0.2 * bonus;
  }
  return base;
}

/**
 * Layer 3: practice compatibility. Each patient preference contributes in proportion to its
 * importance and our confidence in it. Unknown or unreviewed clinician traits regress to neutral.
 */
export function practiceScore(c: ClinicianRecord, s: PatientSignals) {
  let num = 0;
  let den = 0;
  for (const [d, pref] of Object.entries(s.preferences) as [Dimension, NonNullable<PatientSignals['preferences'][Dimension]>][]) {
    const w = IMPORTANCE[d] * CONFIDENCE[pref.confidence];
    const t = usableTrait(c, d);
    const conf = t ? CONFIDENCE[t.confidence] : 0;
    const sim = t ? similarity(d, pref.value, t.value) : 0.5;
    num += w * (conf * sim + (1 - conf) * 0.5);
    den += w;
  }
  return den === 0 ? 0.5 : num / den;
}

/** Layer 4: availability, cost, travel. A small adjustment, never a veto (that's Layer 1). */
export function practicalScore(c: ClinicianRecord, s: PatientSignals) {
  const p = c.practical;
  const availability = 1 - Math.min(p.daysUntilAvailable, 14) / 14;
  const cost = 1 - Math.min(p.gapAfterMedicare, 100) / 100;
  const k = s.constraints;
  let travel = 0.5;
  if (k.origin && p.modes.includes('in_person') && k.mode !== 'telehealth_only') {
    travel = 1 - Math.min(distanceKm(k.origin, c.location), 20) / 20;
  }
  if (k.mode !== 'in_person_only' && p.modes.includes('telehealth')) travel = Math.max(travel, 0.7);
  return (availability + cost + travel) / 3;
}

export function score(c: ClinicianRecord, s: PatientSignals): Scored {
  const layers = { clinical: clinicalScore(c, s), practice: practiceScore(c, s), practical: practicalScore(c, s) };
  const total = (Object.keys(layers) as Layer[]).reduce((sum, l) => sum + LAYER_WEIGHT[l] * layers[l], 0);
  return { clinicianId: c.id, total, layers, fit: fitFor(total) };
}

/** Provisional ranking, best first. Ties broken by id so results are stable. */
export function rank(cs: ClinicianRecord[], s: PatientSignals): Scored[] {
  return cs.map((c) => score(c, s)).sort((a, b) => b.total - a.total || a.clinicianId.localeCompare(b.clinicianId));
}

/** Whether this clinician stands out more on clinical expertise or on practice fit (PRD §31 diversity). */
export function strongestLayer(x: Scored): Layer {
  return x.layers.clinical > x.layers.practice ? 'clinical' : 'practice';
}
