import type { IconName } from '@/components/icons';
import type { ProfessionChoice } from '@/features/match/sessionCore';

// Wording that follows the profession chosen in the funnel.

/** Every kind of professional WATL can suggest, as shown on the discovery grid. */
export type ProfessionInfo = {
  id: ProfessionChoice | 'dietitian' | 'psychiatrist';
  one: string;
  many: string;
  /** Two or three words on the tile: what they're for. */
  for: string;
  icon: IconName;
  /** False = none in the network yet (shown, but not searchable). */
  available: boolean;
};

export const PROFESSION_INFO: ProfessionInfo[] = [
  { id: 'gp', one: 'GP', many: 'GPs', for: 'Diagnosis, medication', icon: 'icProGp', available: true },
  { id: 'psychologist', one: 'psychologist', many: 'psychologists', for: 'Talking therapy', icon: 'icProPsych', available: true },
  { id: 'adhd_coach', one: 'ADHD coach', many: 'ADHD coaches', for: 'Routines, focus', icon: 'icProCoach', available: true },
  { id: 'occupational_therapist', one: 'occupational therapist', many: 'occupational therapists', for: 'Sensory, daily life', icon: 'icProOt', available: true },
  { id: 'physiotherapist', one: 'physiotherapist', many: 'physiotherapists', for: 'Pain, injury', icon: 'icProPhysio', available: true },
  { id: 'exercise_physiologist', one: 'exercise physiologist', many: 'exercise physiologists', for: 'Exercise as medicine', icon: 'icProExercise', available: true },
  { id: 'neurotherapist', one: 'neurotherapy practitioner', many: 'neurotherapy practitioners', for: 'Brain mapping', icon: 'icProNeuro', available: true },
  { id: 'psychiatrist', one: 'psychiatrist', many: 'psychiatrists', for: 'Specialist, medication', icon: 'icProGp', available: false },
  { id: 'dietitian', one: 'dietitian or nutritionist', many: 'dietitians and nutritionists', for: 'Food, nutrition', icon: 'icProDiet', available: false },
];

/**
 * One-card introductions for the discovery queue: three short facts each. General Australian
 * information (rebates depend on the person's situation), to be reviewed with a clinical advisor
 * before launch (docs/safety.md).
 */
export const INTRO: Record<Exclude<ProfessionInfo['id'], 'either'>, { helps: string; sessions: string; rebates: string }> = {
  gp: { helps: 'Diagnosis, medication, referrals', sessions: '15–30 min visits', rebates: 'Medicare rebates' },
  psychiatrist: { helps: 'Specialist diagnosis, medication', sessions: 'Usually by GP referral', rebates: 'Medicare rebates with a referral' },
  psychologist: { helps: 'Talking therapy, assessments', sessions: 'About 50 min', rebates: 'Medicare rebates with a GP plan' },
  adhd_coach: { helps: 'Routines, focus, follow-through', sessions: 'Weekly or fortnightly', rebates: 'Usually no rebates' },
  occupational_therapist: { helps: 'Sensory needs, daily skills', sessions: 'Clinic, home or school', rebates: 'NDIS or private health' },
  physiotherapist: { helps: 'Pain, injury, movement', sessions: 'Hands-on and exercises', rebates: 'Private health, some GP plans' },
  exercise_physiologist: { helps: 'Exercise for health and mood', sessions: 'Programs built for you', rebates: 'Private health, some GP plans' },
  neurotherapist: { helps: 'Brain mapping, neurofeedback', sessions: 'Assessment, then training', rebates: 'Usually no rebates' },
  dietitian: { helps: 'Food, eating, nutrition', sessions: 'Plans that fit your life', rebates: 'Private health, some GP plans' },
};

const info = (p?: ProfessionChoice) => PROFESSION_INFO.find((x) => x.id === p);

/** "a" or "an" by sound: an ADHD coach, an occupational therapist, a GP, a psychologist. */
export const article = (word: string) => (/^(ADHD|[aeio])/i.test(word) ? 'an' : 'a');

/** Tile and label text: "GP", "ADHD coach", "Occupational therapist". */
export const capitalised = (word: string) => (/^[A-Z]{2}/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1));

export function copyFor(p?: ProfessionChoice) {
  const x = info(p);
  if (p === 'gp') {
    return { title: 'Find a GP who fits you.', prompt: 'What are you hoping a new GP will be better at for you?', one: 'GP', many: 'GPs' };
  }
  if (x && p !== 'either') {
    return { title: `Find ${article(x.one)} ${x.one} who fits you.`, prompt: `What are you hoping ${article(x.one)} ${x.one} can help with?`, one: x.one, many: x.many };
  }
  return { title: 'Find someone who fits you.', prompt: "What's going on, and what are you hoping for?", one: 'professional', many: 'professionals' };
}

/**
 * The results headline. `explained` = how many of the featured matches have an evidence-backed
 * reason. With none, nothing the patient said picks one out yet, so it doesn't claim to recommend.
 */
/** The headline over the matches, or null when no reason picks anyone out (nothing worth saying). */
export function matchesHeadline(count: number, p?: ProfessionChoice, explained = count): string | null {
  const { one, many } = copyFor(p);
  if (explained === 0) return null;
  if (count === 3) return `I found 3 ${many} I'd start with.`;
  return count === 1 ? `I found 1 ${one} I'd recommend.` : `I found ${count} ${many} I'd recommend.`;
}

/** The line under the headline, or null. Never says "different reasons" when there aren't any. */
export function matchesSubline(count: number, explained: number) {
  if (explained >= 2) return 'Each fits for slightly different reasons.';
  return null;
}
