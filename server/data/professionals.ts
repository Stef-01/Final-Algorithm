import type { ClinicianRecord } from '../engine/types';
import interviews from './interviews.json';
import { applyInterview, type ApprovedInterview } from './overlay';
import records from './professionals.json';

// GPs and psychologists from the ADHDme network, converted by scripts/import-adhdme.py from their
// published profiles (traits marked "profile"), with any approved onboarding interview applied on
// top (scripts/interview.py; traits marked "approved").
const approved = interviews as Record<string, ApprovedInterview>;

export const professionals = (records as ClinicianRecord[]).map((r) => applyInterview(r, approved[r.id]));
