import type { ClinicianRecord, Dimension, Evidence } from '../engine/types';

// Applies an approved onboarding interview (scripts/interview.py review) on top of a clinician's
// record. Interview traits replace profile-sourced traits for the same dimension or area, and
// practical facts the clinician confirmed replace "not published".

export type ApprovedInterview = {
  clinicianId: string;
  interviewDate: string;
  practical: Partial<ClinicianRecord['practical']>;
  phenotype: ClinicianRecord['phenotype'];
  expertise: ClinicianRecord['expertise'];
  evidence: Evidence[];
};

export function applyInterview(record: ClinicianRecord, interview?: ApprovedInterview): ClinicianRecord {
  if (!interview) return record;
  const replacedDims = new Set(Object.keys(interview.phenotype) as Dimension[]);
  const replacedAreas = new Set(interview.expertise.map((e) => e.area.toLowerCase()));

  const dropped = new Set<string>();
  for (const d of replacedDims) for (const id of record.phenotype[d]?.evidenceIds ?? []) dropped.add(id);
  for (const e of record.expertise) if (replacedAreas.has(e.area.toLowerCase())) e.evidenceIds.forEach((id) => dropped.add(id));

  return {
    ...record,
    practical: { ...record.practical, ...interview.practical },
    phenotype: { ...record.phenotype, ...interview.phenotype },
    expertise: [...record.expertise.filter((e) => !replacedAreas.has(e.area.toLowerCase())), ...interview.expertise],
    evidence: [...record.evidence.filter((e) => !dropped.has(e.id)), ...interview.evidence],
  };
}
