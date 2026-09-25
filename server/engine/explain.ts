import { expertiseLevel, IMPORTANCE, isUsableStatus, similarity, usableTrait } from './score';
import { CONFIDENCE, type ClinicianRecord, type Dimension, type PatientSignals, type Reason } from './types';

// Match explanations (PRD §4.8–4.9, §26–27, §32). Each reason pairs something the patient
// said or implied with an approved, patient-facing evidence line about the clinician.
// Nothing here is generated freely: clinician behaviour comes only from reviewed evidence.

export const MAX_REASONS = 3;

/** Only preferences the clinician matches at least this closely are used as reasons. */
const MIN_SIMILARITY = 0.75;

const SIGNAL: Partial<Record<Dimension, Record<string, string>>> = {
  consultation_pace: {
    unhurried: "You'd like appointments that don't feel rushed.",
    standard: "You'd like standard-length appointments that stay on track.",
    brisk: "You'd like appointments to be quick and efficient.",
  },
  shared_decision_making: {
    shared: "You'd like to hear the options and decide together.",
    clinician_led: "You'd like a clear recommendation.",
    patient_led: "You'd like to decide once the options are explained.",
  },
  explanation_depth: {
    detailed: "You want to know why something's being recommended.",
    moderate: "You'd like some of the reasoning behind recommendations.",
    brief: 'You prefer the key points without a long explanation.',
  },
  mental_health_integration: {
    high: 'You want mental health looked at alongside everything else.',
    moderate: "You'd like mental health covered when you raise it.",
    low: "You'd prefer to keep mental health separate.",
  },
  communication_directness: {
    direct: "You'd like things said plainly.",
    balanced: "You'd like a mix of directness and context.",
    gentle: "You'd like difficult news delivered gently.",
  },
  diagnostic_style: {
    investigative: "You'd like unclear problems investigated further.",
    balanced: "You'd like to talk through the options when something's unclear.",
    pragmatic: "You'd like a clear plan when something's unclear.",
  },
  medication_philosophy: {
    conservative: "You'd like to try other things before medication.",
    moderate: "You're open to medication when it makes sense.",
    proactive: "You'd like medication considered early.",
  },
  lifestyle_integration: { high: 'You want lifestyle factors like sleep and stress in the plan.' },
  care_coordination: { high: "You'd like your care coordinated with other practitioners." },
  uncertainty_tolerance: { high: 'You have several things going on at once.' },
  patient_autonomy: { high: "You'd like to make the final call yourself." },
  continuity: {
    high: 'Seeing the same GP each time matters to you.',
    moderate: "You'd like to see the same GP when you can.",
  },
  follow_up_intensity: {
    proactive: "You'd like your GP to follow up with you.",
    scheduled: "You'd like regular check-ins.",
    as_needed: "You'd like follow-up only when you ask for it.",
  },
  therapy_style: {
    practical: 'You want practical strategies you can use day to day.',
    exploratory: 'You want to understand why things happen, not just get a list of strategies.',
    balanced: 'You want a mix of insight and practical strategies.',
  },
  neurodiversity_affirming: {
    high: "You'd like someone who treats ADHD as a difference, not a deficit.",
  },
};

/** "Career and performance" → "career and performance"; acronyms like ADHD and NDIS stay as they are. */
export function areaPhrase(area: string) {
  return area.replace(/^([A-Z])([a-z])/, (_m, a: string, b: string) => a.toLowerCase() + b);
}

function signalFor(d: Dimension, value: string, quote?: string) {
  if (quote) return `You said ${quote.replace(/[.!?]+$/, '')}.`;
  return SIGNAL[d]?.[value];
}

function approvedEvidence(c: ClinicianRecord, ids: string[]) {
  return c.evidence.find(
    (e) => ids.includes(e.id) && isUsableStatus(e.reviewerStatus) && CONFIDENCE[e.confidence] >= CONFIDENCE.medium,
  );
}

export function reasonsFor(c: ClinicianRecord, s: PatientSignals, max = MAX_REASONS): Reason[] {
  const candidates: (Reason & { weight: number })[] = [];

  for (const [d, pref] of Object.entries(s.preferences) as [Dimension, NonNullable<PatientSignals['preferences'][Dimension]>][]) {
    const t = usableTrait(c, d);
    if (!t) continue;
    const sim = similarity(d, pref.value, t.value);
    if (sim < MIN_SIMILARITY) continue;
    const ev = approvedEvidence(c, t.evidenceIds);
    const signal = signalFor(d, pref.value, pref.quote);
    if (!ev || !signal) continue;
    const weight = IMPORTANCE[d] * CONFIDENCE[pref.confidence] * CONFIDENCE[t.confidence] * sim;
    candidates.push({ signal, evidenceId: ev.id, evidence: ev.patientFacing, dimension: d, weight });
  }

  for (const need of s.clinicalNeeds) {
    if (expertiseLevel(c, need.area) < 1) continue;
    const e = c.expertise.find((x) => x.area.toLowerCase() === need.area.toLowerCase())!;
    const ev = approvedEvidence(c, e.evidenceIds);
    if (!ev) continue;
    const signal = need.quote ? `You said ${need.quote.replace(/[.!?]+$/, '')}.` : `You're looking for help with ${areaPhrase(need.area)}.`;
    candidates.push({ signal, evidenceId: ev.id, evidence: ev.patientFacing, dimension: 'expertise', weight: 0.8 * CONFIDENCE[need.confidence] });
  }

  candidates.sort((a, b) => b.weight - a.weight || a.evidenceId.localeCompare(b.evidenceId));
  const out: Reason[] = [];
  const usedDims = new Set<string>();
  const usedEvidence = new Set<string>();
  for (const { weight: _w, ...r } of candidates) {
    if (usedEvidence.has(r.evidenceId) || (r.dimension !== 'expertise' && usedDims.has(r.dimension))) continue;
    // At most one expertise reason, so the card doesn't read as a list of conditions.
    if (r.dimension === 'expertise' && usedDims.has('expertise')) continue;
    usedDims.add(r.dimension);
    usedEvidence.add(r.evidenceId);
    out.push(r);
    if (out.length === max) break;
  }
  return out;
}

// ---- Patient-facing summaries for the cards (PRD §30, §33) -----------------

const STYLE_LABEL: Partial<Record<Dimension, Record<string, string>>> = {
  shared_decision_making: { shared: 'Collaborative', clinician_led: 'Clear recommendations', patient_led: 'Leaves decisions to you' },
  communication_directness: { direct: 'Direct', gentle: 'Gentle' },
  consultation_pace: { unhurried: 'Longer visits', brisk: 'Efficient visits' },
  explanation_depth: { detailed: 'Explains reasoning' },
  diagnostic_style: { investigative: 'Investigative', pragmatic: 'Practical plans' },
  uncertainty_tolerance: { high: 'Comfortable with complexity' },
  follow_up_intensity: { proactive: 'Active follow-up', scheduled: 'Regular reviews' },
  care_coordination: { high: 'Coordinates care' },
  mental_health_integration: { high: 'Integrates mental health' },
  lifestyle_integration: { high: 'Lifestyle-focused' },
  medication_philosophy: { conservative: 'Cautious with medication' },
  continuity: { high: 'Continuity of care' },
  therapy_style: { practical: 'Practical strategies', exploratory: 'Explores the why', balanced: 'Strategies and insight' },
  neurodiversity_affirming: { high: 'Neurodiversity-affirming' },
};

/** "How they practise": up to 5 behaviours, most confident first. */
export function practiceStyle(c: ClinicianRecord, max = 5): string[] {
  return (Object.keys(c.phenotype) as Dimension[])
    .map((d) => ({ d, t: usableTrait(c, d) }))
    .filter((x): x is { d: Dimension; t: NonNullable<ReturnType<typeof usableTrait>> } => !!x.t)
    .map((x) => ({ label: STYLE_LABEL[x.d]?.[x.t.value], conf: CONFIDENCE[x.t.confidence], imp: IMPORTANCE[x.d] }))
    .filter((x): x is { label: string; conf: number; imp: number } => !!x.label)
    .sort((a, b) => b.conf - a.conf || b.imp - a.imp)
    .slice(0, max)
    .map((x) => x.label);
}

/** "Particularly experienced with": up to 4 areas backed by approved evidence. */
export function experiencedWith(c: ClinicianRecord, max = 4): string[] {
  return c.expertise.filter((e) => e.level === 'particular' && expertiseLevel(c, e.area) === 1).slice(0, max).map((e) => e.area);
}

// ---- Copy rules, shared by tests and (Phase 3) runtime output checks --------

export const BANNED_ADJECTIVES = /\b(caring|compassionate|holistic|warm|patient-cent(red|ered)|thorough|understanding)\b/i;
export const WINNER_LANGUAGE = /perfect match|best doctor|ideal clinician|number one/i;

export function copyProblems(text: string): string[] {
  const out: string[] = [];
  if (BANNED_ADJECTIVES.test(text)) out.push('unsupported adjective');
  if (WINNER_LANGUAGE.test(text)) out.push('winner language');
  if (/\d\s*%/.test(text)) out.push('percentage');
  return out;
}
