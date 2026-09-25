import type { ClinicianRecord } from '../engine/types';
import records from './professionals.json';

// GPs and psychologists from the ADHDme network, converted by scripts/import-adhdme.py from their
// published profiles. Traits are profile-sourced (reviewerStatus "profile"), not yet interview-reviewed.
export const professionals = records as ClinicianRecord[];
