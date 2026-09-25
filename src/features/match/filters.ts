import type { PatientSignals } from '@server/engine/types';
import { AREAS_NEAR } from '@server/places';

// Filters: the original app's Preferences screen ("Open to all" rows), for health. Each filter sets
// or lifts one requirement on the current search, overriding what the words implied. Unset = keep
// whatever the search already had. Known facts rule people out; unpublished ones are flagged
// "Worth checking", as everywhere else.

export { AREAS_NEAR };

export type AreaId = (typeof AREAS_NEAR)[number]['id'];

export type Filters = {
  mode?: 'any' | 'in_person_only' | 'telehealth_only';
  cost?: 'any' | 'bulk';
  gender?: 'any' | 'female' | 'male';
  near?: (typeof AREAS_NEAR)[number]['id'];
  distance?: 'any' | 5 | 15 | 50;
  language?: 'any' | string;
  wheelchair?: 'any' | 'yes';
  weekends?: 'any' | 'yes';
};

type Option<K extends keyof Filters> = { value: NonNullable<Filters[K]>; label: string };
export type FilterDef<K extends keyof Filters = keyof Filters> = { key: K; label: string; options: Option<K>[] };

export function filterDefs(languages: string[]): FilterDef[] {
  return [
    { key: 'mode', label: 'Appointments', options: [{ value: 'any', label: 'Open to all' }, { value: 'in_person_only', label: 'In person' }, { value: 'telehealth_only', label: 'Telehealth' }] },
    { key: 'cost', label: 'Cost', options: [{ value: 'any', label: 'Open to all' }, { value: 'bulk', label: 'Bulk billed' }] },
    { key: 'near', label: 'Near', options: AREAS_NEAR.map((a) => ({ value: a.id, label: a.label })) },
    { key: 'distance', label: 'Distance', options: [{ value: 'any', label: 'Open to all' }, { value: 5, label: '5 km' }, { value: 15, label: '15 km' }, { value: 50, label: '50 km' }] },
    { key: 'gender', label: 'Clinician gender', options: [{ value: 'any', label: 'Open to all' }, { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }] },
    { key: 'language', label: 'Language', options: [{ value: 'any', label: 'Open to all' }, ...languages.filter((l) => l !== 'English').map((l) => ({ value: l, label: l }))] },
    { key: 'wheelchair', label: 'Wheelchair access', options: [{ value: 'any', label: 'Open to all' }, { value: 'yes', label: 'Needed' }] },
    { key: 'weekends', label: 'Weekends', options: [{ value: 'any', label: 'Open to all' }, { value: 'yes', label: 'Needed' }] },
  ] as FilterDef[];
}

/** Apply filters on top of everything else (the last word, like the no-match loosening). */
export function applyFilters(s: PatientSignals, f: Filters | undefined): PatientSignals {
  if (!f) return s;
  const k = { ...s.constraints };
  if (f.mode) k.mode = f.mode;
  if (f.cost === 'bulk') k.maxGap = 0;
  if (f.cost === 'any') k.maxGap = null;
  if (f.gender === 'any') delete k.clinicianGender;
  else if (f.gender) k.clinicianGender = f.gender;
  const area = AREAS_NEAR.find((a) => a.id === f.near);
  if (area) {
    k.origin = area.origin;
    k.originLabel = area.label;
    if (k.maxKm === undefined && f.distance === undefined) k.maxKm = 50;
  }
  if (f.distance === 'any') delete k.maxKm;
  else if (f.distance && k.origin) k.maxKm = f.distance;
  if (f.language === 'any') delete k.languages;
  else if (f.language) k.languages = [f.language];
  if (f.wheelchair === 'yes') k.accessibility = ['wheelchair'];
  if (f.wheelchair === 'any') delete k.accessibility;
  if (f.weekends === 'yes') k.needsWeekend = true;
  if (f.weekends === 'any') k.needsWeekend = false;
  return { ...s, constraints: k };
}

/** What each filter currently is on this search, including what the words set ("Telehealth"). */
export type FilterValues = Record<keyof Filters, string | number | undefined>;

export function currentValues(s: PatientSignals): FilterValues {
  const k = s.constraints;
  return {
    mode: k.mode && k.mode !== 'any' ? k.mode : 'any',
    cost: k.maxGap === 0 ? 'bulk' : 'any',
    gender: k.clinicianGender ?? 'any',
    near: AREAS_NEAR.find((a) => a.label === k.originLabel)?.id,
    distance: k.origin && k.maxKm !== undefined ? (([5, 15, 50] as const).find((d) => d === k.maxKm) ?? 'any') : 'any',
    language: k.languages?.[0] ?? 'any',
    wheelchair: k.accessibility?.includes('wheelchair') ? 'yes' : 'any',
    weekends: k.needsWeekend ? 'yes' : 'any',
  };
}

/** How many filters are narrowing the search (for the badge). */
export const activeCount = (s: PatientSignals) =>
  Object.entries(currentValues(s)).filter(([key, v]) => v !== undefined && v !== 'any' && key !== 'near').length;
