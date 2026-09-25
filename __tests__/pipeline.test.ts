import { professionals } from '../server/data/professionals';
import { applyInterview, type ApprovedInterview } from '../server/data/overlay';
import { recommend } from '../server/engine';
import { usableTrait } from '../server/engine/score';
import { fixtureClinicians } from '../server/fixtures/clinicians';
import interviews from '../server/fixtures/interviews.json';
import { demoSignals } from '../server/fixtures/signals';
import { applyAnswer } from '../server/questions';

const approved = interviews as Record<string, ApprovedInterview>;
const interviewed = fixtureClinicians.map((c) => applyInterview(c, approved[c.id]));
const byId = (id: string) => interviewed.find((c) => c.id === id)!;

describe('onboarding interview overlay (Phase 5)', () => {
  it('runs three mock interviews through the pipeline', () => {
    expect(Object.keys(approved).sort()).toEqual(['amy-chen', 'hannah-lee', 'tom-walsh']);
  });

  it('replaces earlier evidence for the same dimension with the approved interview', () => {
    const amy = byId('amy-chen');
    const pace = amy.phenotype.consultation_pace!;
    expect(pace.evidenceIds).toEqual(['amy-chen-interview-pace']);
    expect(amy.evidence.some((e) => e.id === 'amy-chen-consultation_pace')).toBe(false);
    expect(amy.evidence.find((e) => e.id === 'amy-chen-interview-pace')?.reviewerStatus).toBe('approved');
    expect(usableTrait(amy, 'consultation_pace')?.value).toBe('unhurried');
  });

  it('keeps dimensions the interview did not cover', () => {
    expect(byId('amy-chen').phenotype.uncertainty_tolerance?.evidenceIds).toEqual(['amy-chen-uncertainty_tolerance']);
  });

  it('applies practical facts the clinician confirmed', () => {
    expect(byId('tom-walsh').practical.weekends).toBe(true);
    expect(byId('hannah-lee').practical.initialConsultMins).toBe(40);
  });

  it('leaves out traits the reviewer rejected', () => {
    expect(byId('tom-walsh').evidence.some((e) => e.id === 'tom-walsh-interview-medication')).toBe(false);
  });

  it('explains matches with the interviewed clinician’s own words', () => {
    const s = applyAnswer(demoSignals, 'decision_style', 'Explain them and decide together');
    const r = recommend(s, interviewed, ['decision_style']);
    if (r.status !== 'matches') throw new Error('expected matches');
    const amy = r.matches.find((m) => m.clinicianId === 'amy-chen')!;
    const evidence = amy.reasons.map((x) => x.evidence);
    expect(evidence).toContain('Amy keeps the last five minutes of each visit to agree on next steps with you.');
    expect(amy.reasons.every((x) => x.evidenceId.startsWith('amy-chen-interview-') || !x.evidenceId.includes('interview'))).toBe(true);
  });

  it('changes nothing for clinicians without an approved interview', () => {
    const priya = fixtureClinicians.find((c) => c.id === 'priya-nair')!;
    expect(applyInterview(priya, undefined)).toBe(priya);
    // The real network has no approved interviews yet, so every trait is still profile-sourced.
    expect(professionals.every((c) => c.evidence.every((e) => e.reviewerStatus === 'profile'))).toBe(true);
  });
});
