import type { ClinicianRecord } from '../engine/types';
import interviews from './interviews.json';
import { applyInterview, type ApprovedInterview } from './overlay';
import records from './professionals.json';
import registrations from './registrations.json';

// GPs and psychologists from the ADHDme network, converted by scripts/import-adhdme.py from their
// published profiles (traits marked "profile"), with any approved onboarding interview applied on
// top (scripts/interview.py; traits marked "approved").
const approved = interviews as Record<string, ApprovedInterview>;

const checked = registrations as Record<string, ClinicianRecord['registration']>;

// Registration checks (scripts/registration.py) are layered on last.
export const professionals = (records as ClinicianRecord[]).map((r) => {
  const c = applyInterview(r, approved[r.id]);
  return checked[r.id] ? { ...c, registration: checked[r.id] } : c;
});
