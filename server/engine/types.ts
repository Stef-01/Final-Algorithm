// Matching engine types (docs/PLAN.md §5). Pure data; no React Native imports,
// so the same code runs in Vercel Functions (Phase 3) and in tests.

export type Confidence = 'low' | 'medium' | 'high';

export const CONFIDENCE: Record<Confidence, number> = { low: 0.35, medium: 0.65, high: 0.9 };

/** Practice-compatibility dimensions (PRD §21 layer 3, §24 interview domains). Each is an ordered scale. */
export const DIMENSIONS = {
  consultation_pace: ['brisk', 'standard', 'unhurried'],
  shared_decision_making: ['clinician_led', 'shared', 'patient_led'],
  communication_directness: ['gentle', 'balanced', 'direct'],
  explanation_depth: ['brief', 'moderate', 'detailed'],
  diagnostic_style: ['pragmatic', 'balanced', 'investigative'],
  medication_philosophy: ['conservative', 'moderate', 'proactive'],
  lifestyle_integration: ['low', 'moderate', 'high'],
  mental_health_integration: ['low', 'moderate', 'high'],
  care_coordination: ['low', 'moderate', 'high'],
  uncertainty_tolerance: ['low', 'moderate', 'high'],
  patient_autonomy: ['low', 'moderate', 'high'],
  continuity: ['low', 'moderate', 'high'],
  follow_up_intensity: ['as_needed', 'scheduled', 'proactive'],
  // Psychology-specific: understanding why vs practical strategies, and a neurodiversity-affirming stance.
  therapy_style: ['exploratory', 'balanced', 'practical'],
  neurodiversity_affirming: ['low', 'moderate', 'high'],
} as const;

export const PROFESSIONS = [
  'gp',
  'psychologist',
  'adhd_coach',
  'occupational_therapist',
  'physiotherapist',
  'exercise_physiologist',
  'neurotherapist',
] as const;
export type Profession = (typeof PROFESSIONS)[number];

export type Dimension = keyof typeof DIMENSIONS;
export type DimensionValue<D extends Dimension = Dimension> = (typeof DIMENSIONS)[D][number];

export type Mode = 'in_person' | 'telehealth';

// ---- Patient side ---------------------------------------------------------

export type Preference = { value: string; confidence: Confidence; quote?: string };

export type HardConstraints = {
  /** Where the patient is, if known. */
  origin?: { lat: number; lng: number };
  /** Max travel for in-person care (km). */
  maxKm?: number;
  /** The place the patient named for `origin` ("Southport"), for plain-language replies. */
  originLabel?: string;
  /** 'any' = in person or telehealth. */
  mode?: 'any' | 'in_person_only' | 'telehealth_only';
  /** Max out-of-pocket gap after Medicare, in dollars. `null` = patient said cost isn't a concern. */
  maxGap?: number | null;
  /** Only when the patient explicitly asks (PRD §19). */
  clinicianGender?: 'female' | 'male';
  age?: number;
  needsWeekend?: boolean;
  accessibility?: string[];
  languages?: string[];
};

export type PatientSignals = {
  /** Which kind of professional the patient is looking for; unset = either. */
  profession?: Profession;
  clinicalNeeds: { area: string; confidence: Confidence; quote?: string }[];
  preferences: Partial<Record<Dimension, Preference>>;
  constraints: HardConstraints;
  complexity?: 'single' | 'multiple' | 'complex';
  safetyFlag?: { level: 'urgent' | 'concern'; reason: string };
};

// ---- Clinician side --------------------------------------------------------

export type Evidence = {
  id: string;
  trait: Dimension | 'expertise';
  /** Interview excerpt. Internal only: never sent to the client (PRD §45). */
  excerpt: string;
  /** Reviewed, patient-facing line used in explanations. */
  patientFacing: string;
  scenario: string;
  timestamp: string;
  confidence: Confidence;
  /**
   * 'approved' = reviewed after the onboarding interview. 'profile' = taken from the clinician's own
   * published profile and not yet interview-reviewed; usable, but capped at medium confidence.
   */
  reviewerStatus: 'draft' | 'approved' | 'profile' | 'rejected';
};

export type Qualification = {
  title: string;
  /** Where from (a university) or the post-nominal it decodes. */
  detail?: string;
  /** "In progress", "Completed", "Member". */
  badge?: string;
  kind: 'degree' | 'membership' | 'certification';
};

export type ClinicianRecord = {
  id: string;
  name: string;
  firstName: string;
  profession: Profession;
  /** Display role, e.g. "GP", "Clinical Psychologist". */
  role: string;
  practice?: string;
  /** Coordinates are null when there are no rooms to visit (telehealth only). */
  location: { suburb: string; city: string; lat: number | null; lng: number | null };
  photo: string;
  bio: string;
  credentials: string[];
  /** Qualifications as separate items, in the profile's own words (scripts/import-adhdme.py). */
  qualifications?: Qualification[];
  bookingUrl: string | null;
  practical: {
    nextAvailable: string;
    /** null = not published. */
    daysUntilAvailable: number | null;
    modes: Mode[];
    /** null = not published ("fee on request"). */
    fee: number | null;
    /** Out of pocket after any Medicare rebate; null = not published. */
    gapAfterMedicare: number | null;
    /** Human-readable billing line from the source, shown on the detail page. */
    billingNote?: string;
    /** null = not published; only `false` rules someone out. */
    newPatients: boolean | null;
    ageRange: [number, number];
    languages: string[];
    accessibility: string[];
    gender: 'female' | 'male' | 'nonbinary' | 'undeclared';
    initialConsultMins: number | null;
    /** null = not declared; only `true` satisfies a weekend requirement. */
    weekends: boolean | null;
  };
  expertise: { area: string; level: 'particular' | 'general'; evidenceIds: string[] }[];
  phenotype: Partial<Record<Dimension, { value: string; confidence: Confidence; evidenceIds: string[] }>>;
  evidence: Evidence[];
};

// ---- Outputs ---------------------------------------------------------------

/** 'Possible fit' = meets the patient's requirements, but nothing they said matches a specific trait yet. */
export type FitLabel = 'Strong fit' | 'Good fit' | 'Worth considering' | 'Possible fit';

/** Things the patient asked for that this clinician's profile doesn't publish, so can't be confirmed. */
export type Caveat = 'fee_unpublished' | 'weekend_hours_unpublished';

export type Layer = 'clinical' | 'practice' | 'practical';

export type Scored = {
  clinicianId: string;
  total: number;
  layers: Record<Layer, number>;
  fit: FitLabel;
  caveats: Caveat[];
};

export type Reason = { signal: string; evidenceId: string; evidence: string; dimension: Dimension | 'expertise' };

export type EngineMatch = { clinicianId: string; fit: FitLabel; reasons: Reason[]; strongestLayer: Layer; caveats: Caveat[] };

/** Loosen one requirement (only offered when that alone would let someone fit), or answer more. */
export type NoMatchAction = 'include_telehealth' | 'expand_distance' | 'any_cost' | 'any_gender' | 'any_profession' | 'answer_more';

export type Recommendation =
  | { status: 'matches'; matches: EngineMatch[]; more: EngineMatch[] }
  | { status: 'none'; actions: NoMatchAction[] };
