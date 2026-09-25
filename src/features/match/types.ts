import type { ImageSourcePropType } from 'react-native';

import type { FitLabel, NoMatchAction, Profession } from '@server/engine/types';

export type { FitLabel, NoMatchAction, Profession };

// Shapes the screens use. The engine's own types live in server/engine/types.ts.

/** What the cards show about a clinician (built from a reviewed record by src/data/clinicians.ts). */
export type Clinician = {
  id: string;
  name: string;
  firstName: string;
  profession: Profession;
  /** e.g. "GP", "Clinical Psychologist". */
  role: string;
  practice?: string;
  suburb: string;
  city: string;
  photo: ImageSourcePropType;
  bio: string;
  credentials: string[];
  bookingUrl: string | null;
  practical: {
    nextAvailableShort: string;
    nextAvailable: string;
    modes: ('In person' | 'Telehealth')[];
    /** null = not published. */
    fee: number | null;
    gapAfterMedicare: number | null;
    billingNote?: string;
    weekends: boolean | null;
  };
  /** "Particularly experienced with" — max 4. */
  experiencedWith: string[];
  /** "How they practise" — max 5. */
  practiceStyle: string[];
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

export type Priority = { dimension: string; label: string };

export type MatchResult =
  | { status: 'matches'; matches: Match[]; more: Match[] }
  | { status: 'none'; actions: NoMatchAction[] };

/** What the agent decided after a patient turn (PRD §11 step 4). */
export type AgentStep =
  | { type: 'ask'; question: Question }
  | { type: 'confirm'; priorities: Priority[] }
  | { type: 'safety' }
  | { type: 'match' };
