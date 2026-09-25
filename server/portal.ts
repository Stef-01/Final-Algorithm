import { PROFESSIONS, type Profession } from './engine/types';

// "Join WATL": a professional tells WATL what profiles usually leave out (fees, rebates, wait,
// weekends, telehealth) in their own words. The same rules as the onboarding interview apply
// (scripts/interview.py): consent is required, any number given must appear in their own words,
// and the gap can't exceed the fee. A submission is queued for a person to review; nothing it
// says is shown to patients until it's approved through the interview pipeline.

export type Submission = {
  name: string;
  email: string;
  profession: Profession;
  practice: string;
  suburb: string;
  consent: true;
  facts: {
    fee: number | null;
    gap: number | null;
    waitDays: number | null;
    weekends: boolean | null;
    telehealth: boolean | null;
    newPatients: boolean | null;
  };
  /** Their words about fees, rebates and availability. Every number above must appear here. */
  inTheirWords: string;
  /** Two practice-style answers, for the interview pipeline (Claude drafts, a person approves). */
  decisions: string;
  betweenVisits: string;
};

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, max: number) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Math.round(Number(v)) : NaN);
const bool = (v: unknown) => (v === true || v === false ? v : null);
/** A number appears in the words as a whole number ("$120", "120", "a 7 day wait"). */
const said = (n: number, words: string) => new RegExp(`(?<![\\d.])${n}(?![\\d])`).test(words.replace(/,(?=\d{3})/g, ''));

export function parseSubmission(body: unknown): { submission: Submission } | { problems: string[] } {
  const b = (body ?? {}) as Record<string, unknown>;
  const f = (b.facts ?? {}) as Record<string, unknown>;
  const problems: string[] = [];

  const name = text(b.name, 80);
  const email = text(b.email, 120);
  const practice = text(b.practice, 100);
  const suburb = text(b.suburb, 60);
  const inTheirWords = text(b.inTheirWords, 800);
  const profession = (PROFESSIONS as readonly unknown[]).includes(b.profession) ? (b.profession as Profession) : null;
  const facts = {
    fee: num(f.fee, 2000),
    gap: num(f.gap, 2000),
    waitDays: num(f.waitDays, 365),
    weekends: bool(f.weekends),
    telehealth: bool(f.telehealth),
    newPatients: bool(f.newPatients),
  };

  if (!name) problems.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('email');
  if (!profession) problems.push('profession');
  if (!practice) problems.push('practice');
  if (b.consent !== true) problems.push('consent');
  for (const k of ['fee', 'gap', 'waitDays'] as const) {
    const v = facts[k];
    if (Number.isNaN(v)) problems.push(k);
    // The rule from the interview pipeline: a number needs the professional's own words behind it.
    else if (v !== null && k !== 'gap' && !said(v, inTheirWords)) problems.push(`${k}-words`);
  }
  if (facts.fee !== null && facts.gap !== null && !Number.isNaN(facts.fee) && !Number.isNaN(facts.gap) && facts.gap > facts.fee) problems.push('gap-over-fee');
  const anyFact = Object.values(facts).some((v) => v !== null);
  if (anyFact && !inTheirWords) problems.push('inTheirWords');

  if (problems.length) return { problems };
  return {
    submission: {
      name,
      email,
      profession: profession!,
      practice,
      suburb,
      consent: true,
      facts: facts as Submission['facts'],
      inTheirWords,
      decisions: text(b.decisions, 600),
      betweenVisits: text(b.betweenVisits, 600),
    },
  };
}

const slug = (s: string) => s.toLowerCase().replace(/^dr\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * The submission as a draft interview file (scripts/interview.py's format), so a reviewer can run
 * `propose`, `ingest` and `review` on it like any interview.
 */
export function toInterviewDraft(s: Submission, day = new Date().toISOString().slice(0, 10)) {
  const f = s.facts;
  const quote = (n: number | null) => (n === null ? '' : (s.inTheirWords.match(new RegExp(`[^.;\\n]*(?<![\\d.])${n}(?![\\d])[^.;\\n]*`))?.[0].trim() ?? ''));
  return {
    clinicianId: slug(s.name),
    interviewDate: day,
    interviewer: 'Self-submitted through Join WATL (needs review)',
    consent: true,
    practical: {
      fee: f.fee,
      gapAfterMedicare: f.gap,
      daysUntilAvailable: f.waitDays,
      weekends: f.weekends,
      newPatients: f.newPatients,
      initialConsultMins: null,
    },
    // Where each fact came from; the reviewer confirms or edits these before ingest.
    practicalSaid: {
      fee: quote(f.fee),
      gapAfterMedicare: quote(f.gap),
      daysUntilAvailable: quote(f.waitDays),
      weekends: f.weekends === null ? '' : s.inTheirWords,
      newPatients: f.newPatients === null ? '' : s.inTheirWords,
      initialConsultMins: '',
    },
    answers: [
      { scenario: 'logistics', domain: 'Practice logistics', dimension: 'practical', prompt: 'Fees, rebates, wait, weekends, telehealth, new patients.', answer: s.inTheirWords, excerpt: '', proposed: { value: null, area: null, level: null, confidence: 'medium', patientFacing: '' } },
      { scenario: 'sdm', domain: 'Shared decision-making', dimension: 'shared_decision_making', prompt: 'How do you make decisions with patients?', answer: s.decisions, excerpt: '', proposed: { value: null, area: null, level: null, confidence: 'medium', patientFacing: '' } },
      { scenario: 'follow_up', domain: 'Follow-up intensity', dimension: 'follow_up_intensity', prompt: 'What happens between appointments?', answer: s.betweenVisits, excerpt: '', proposed: { value: null, area: null, level: null, confidence: 'medium', patientFacing: '' } },
    ],
    contact: { email: s.email, practice: s.practice, suburb: s.suburb, profession: s.profession, telehealth: f.telehealth },
  };
}
