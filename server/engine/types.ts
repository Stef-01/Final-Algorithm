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
} as const;

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
  reviewerStatus: 'draft' | 'approved' | 'rejected';
};

export type ClinicianRecord = {
  id: string;
  name: string;
  firstName: string;
  role: 'GP';
  location: { suburb: string; city: string; lat: number; lng: number };
  photo: string;
  bio: string;
  credentials: string[];
  bookingUrl: string | null;
  practical: {
    nextAvailable: string;
    daysUntilAvailable: number;
    modes: Mode[];
    fee: number;
    gapAfterMedicare: number;
    newPatients: boolean;
    ageRange: [number, number];
    languages: string[];
    accessibility: string[];
    gender: 'female' | 'male' | 'nonbinary';
    initialConsultMins: number;
    weekends: boolean;
  };
  expertise: { area: string; level: 'particular' | 'general'; evidenceIds: string[] }[];
  phenotype: Partial<Record<Dimension, { value: string; confidence: Confidence; evidenceIds: string[] }>>;
  evidence: Evidence[];
};

// ---- Outputs ---------------------------------------------------------------

export type FitLabel = 'Strong fit' | 'Good fit' | 'Worth considering';

export type Layer = 'clinical' | 'practice' | 'practical';

export type Scored = {
  clinicianId: string;
  total: number;
  layers: Record<Layer, number>;
  fit: FitLabel | null;
};

export type Reason = { signal: string; evidenceId: string; evidence: string; dimension: Dimension | 'expertise' };

export type EngineMatch = { clinicianId: string; fit: FitLabel; reasons: Reason[]; strongestLayer: Layer };

export type NoMatchAction = 'include_telehealth' | 'expand_distance' | 'answer_more';

export type Recommendation =
  | { status: 'matches'; matches: EngineMatch[]; more: EngineMatch[] }
  | { status: 'none'; actions: NoMatchAction[] };
