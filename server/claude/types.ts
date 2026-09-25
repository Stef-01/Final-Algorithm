import type { PatientSignals } from '../engine/types';

/** Loosening a requirement ("any gender is fine", "happy to travel"): not expressible in PatientSignals alone. */
export type Relaxations = { dropGender?: boolean; dropDistance?: boolean };

/** What the Claude extractor returns for one patient message (POST /api/extract). */
export type Extraction = { signals: PatientSignals; relax: Relaxations };
