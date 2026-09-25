import type { ImageSourcePropType } from 'react-native';

// Shared shapes for the matching flow. See docs/PLAN.md §5 for the full model;
// Phase 1 uses the subset the screens need.

export type FitLabel = 'Strong fit' | 'Good fit' | 'Worth considering';

export type Evidence = {
  id: string;
  trait: string;
  /** Reviewed, patient-facing line. Interview excerpts never reach the client. */
  patientFacing: string;
};

export type Clinician = {
  id: string;
  name: string;
  firstName: string;
  role: 'GP';
  suburb: string;
  city: string;
  photo: ImageSourcePropType;
  bio: string;
  credentials: string[];
  practical: {
    nextAvailableShort: string;
    nextAvailable: string;
    modes: ('In person' | 'Telehealth')[];
    fee: number;
    gapAfterMedicare: number;
    weekends: boolean;
  };
  /** "Particularly experienced with" — shown max 4. */
  experiencedWith: string[];
  /** "How they practise" — shown max 5. */
  practiceStyle: string[];
  evidence: Evidence[];
};

/** One reason = what the patient said + what the clinician does (PRD §27). */
export type Reason = { signal: string; evidenceId: string; evidence: string };

export type Match = { clinicianId: string; fit: FitLabel; reasons: Reason[] };

export type Question = {
  id: string;
  ack: string;
  text: string;
  options: string[];
};

export type NoMatchAction = 'include_telehealth' | 'expand_distance' | 'answer_more';

export type MatchResult =
  | { status: 'matches'; matches: Match[]; more: Match[] }
  | { status: 'none'; actions: NoMatchAction[] };

/** What the agent decided to do after a patient turn (PRD §11 step 4). */
export type AgentStep =
  | { type: 'ask'; question: Question }
  | { type: 'confirm'; priorities: string[] }
  | { type: 'safety' }
  | { type: 'match' };
