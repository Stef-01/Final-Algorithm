import type { ProfessionChoice } from '@/features/match/sessionCore';

// Wording that follows the profession chosen in the funnel.

export const PROFESSION_OPTIONS: { choice: ProfessionChoice; label: string }[] = [
  { choice: 'gp', label: 'A GP' },
  { choice: 'psychologist', label: 'A psychologist' },
  { choice: 'either', label: 'Not sure yet' },
];

export function copyFor(p?: ProfessionChoice) {
  switch (p) {
    case 'gp':
      return {
        title: 'Find a GP who fits you.',
        prompt: 'What are you hoping a new GP will be better at for you?',
        one: 'GP',
        many: 'GPs',
      };
    case 'psychologist':
      return {
        title: 'Find a psychologist who fits you.',
        prompt: 'What are you hoping a psychologist can help with?',
        one: 'psychologist',
        many: 'psychologists',
      };
    default:
      return {
        title: 'Find someone who fits you.',
        prompt: "What's going on, and what are you hoping for?",
        one: 'clinician',
        many: 'clinicians',
      };
  }
}

/**
 * The results headline. `explained` = how many of the featured matches have an evidence-backed
 * reason. With none, nothing the patient said picks one out yet, so it doesn't claim to recommend.
 */
export function matchesHeadline(count: number, p?: ProfessionChoice, explained = count) {
  const { one, many } = copyFor(p);
  if (explained === 0) return count === 1 ? `This ${one} meets what you asked for.` : `These ${many} meet what you asked for.`;
  if (count === 3) return `I found 3 ${many} I'd start with.`;
  return count === 1 ? `I found 1 ${one} I'd recommend.` : `I found ${count} ${many} I'd recommend.`;
}

/** The line under the headline, or null. Never says "different reasons" when there aren't any. */
export function matchesSubline(count: number, explained: number) {
  if (explained === 0) return "Nothing you've told me points to one over another yet. Tell the assistant what matters to you and I'll rank them.";
  if (explained >= 2) return 'Each fits for slightly different reasons.';
  return null;
}
