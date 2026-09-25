import type { ClinicianRecord, HardConstraints } from './types';

// Layer 1 (PRD §19–21): remove clinicians who can't meet a *known* hard constraint.
// Unknown constraints are never assumed.

export type Failure =
  | 'new_patients'
  | 'age'
  | 'mode'
  | 'distance'
  | 'cost'
  | 'gender'
  | 'weekend'
  | 'accessibility'
  | 'language';

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Can the patient reach this clinician in person, given what we know? */
export function inPersonReachable(c: ClinicianRecord, k: HardConstraints) {
  if (!c.practical.modes.includes('in_person')) return false;
  if (!k.origin || k.maxKm === undefined) return true;
  return distanceKm(k.origin, c.location) <= k.maxKm;
}

export function failures(c: ClinicianRecord, k: HardConstraints): Failure[] {
  const p = c.practical;
  const out: Failure[] = [];
  if (!p.newPatients) out.push('new_patients');
  if (k.age !== undefined && (k.age < p.ageRange[0] || k.age > p.ageRange[1])) out.push('age');

  const telehealth = p.modes.includes('telehealth');
  const inPerson = inPersonReachable(c, k);
  const mode = k.mode ?? 'any';
  if (mode === 'telehealth_only' && !telehealth) out.push('mode');
  if (mode === 'in_person_only' && !inPerson) out.push(p.modes.includes('in_person') ? 'distance' : 'mode');
  if (mode === 'any' && !inPerson && !telehealth) out.push('distance');

  if (typeof k.maxGap === 'number' && p.gapAfterMedicare > k.maxGap) out.push('cost');
  if (k.clinicianGender && p.gender !== k.clinicianGender) out.push('gender');
  if (k.needsWeekend && !p.weekends) out.push('weekend');
  if (k.accessibility?.some((a) => !p.accessibility.includes(a))) out.push('accessibility');
  if (k.languages?.length && !k.languages.some((l) => p.languages.includes(l))) out.push('language');
  return out;
}

export const isEligible = (c: ClinicianRecord, k: HardConstraints) => failures(c, k).length === 0;

export const eligibleSet = (cs: ClinicianRecord[], k: HardConstraints) => cs.filter((c) => isEligible(c, k));
