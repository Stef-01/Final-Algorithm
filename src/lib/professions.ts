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

export function matchesHeadline(count: number, p?: ProfessionChoice) {
  const { one, many } = copyFor(p);
  if (count === 3) return `I found 3 ${many} I'd start with.`;
  return count === 1 ? `I found 1 ${one} I'd recommend.` : `I found ${count} ${many} I'd recommend.`;
}
