import type { Dimension, HardConstraints, PatientSignals, Profession } from './engine/types';

// Curated follow-up questions (PRD §13–15). Each asks about behaviour, not labels, and
// every option says how it changes the patient's signals so the engine can simulate answers.

export type Target = { kind: 'preference'; dimension: Dimension } | { kind: 'constraint'; key: keyof HardConstraints };

/** `prior`: how likely this answer is before asking (defaults to equal). Constraint answers use
 * realistic priors so rare hard limits don't crowd out preference questions (PRD §20). */
export type Option = { label: string; apply?: (s: PatientSignals) => PatientSignals; prior?: number };

export type BankQuestion = {
  id: string;
  target: Target;
  text: string;
  options: Option[];
  /** Only asked when looking for one of these professions (all, if omitted). */
  professions?: Profession[];
};

export const NOT_SURE = 'Not sure';

const pref =
  (d: Dimension, value: string, extra?: Partial<Record<Dimension, string>>) =>
  (s: PatientSignals): PatientSignals => {
    const preferences = { ...s.preferences, [d]: { value, confidence: 'high' as const } };
    for (const [k, v] of Object.entries(extra ?? {})) preferences[k as Dimension] = { value: v!, confidence: 'high' };
    return { ...s, preferences };
  };

const constraint =
  (k: Partial<HardConstraints>) =>
  (s: PatientSignals): PatientSignals => ({ ...s, constraints: { ...s.constraints, ...k } });

export const QUESTIONS: BankQuestion[] = [
  {
    id: 'decision_style',
    target: { kind: 'preference', dimension: 'shared_decision_making' },
    text: 'When there are several reasonable options, what do you prefer?',
    options: [
      { label: 'Recommend the best one', apply: pref('shared_decision_making', 'clinician_led') },
      { label: 'Explain them and decide together', apply: pref('shared_decision_making', 'shared') },
      {
        label: 'Let me decide after explaining',
        apply: pref('shared_decision_making', 'patient_led', { patient_autonomy: 'high' }),
      },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'pace',
    target: { kind: 'preference', dimension: 'consultation_pace' },
    text: 'How much time do you usually need in an appointment?',
    options: [
      { label: 'Quick is fine', apply: pref('consultation_pace', 'brisk') },
      { label: 'A standard visit', apply: pref('consultation_pace', 'standard') },
      { label: 'Longer, unhurried visits', apply: pref('consultation_pace', 'unhurried') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'explanation',
    target: { kind: 'preference', dimension: 'explanation_depth' },
    text: 'When {clinician} recommends something, how much of the reasoning do you want?',
    options: [
      { label: 'Just the key points', apply: pref('explanation_depth', 'brief') },
      { label: 'Some of the reasoning', apply: pref('explanation_depth', 'moderate') },
      { label: 'The full reasoning', apply: pref('explanation_depth', 'detailed') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'mental_health',
    professions: ['gp'],
    target: { kind: 'preference', dimension: 'mental_health_integration' },
    text: 'Would you like your GP to look at mental health alongside everything else?',
    options: [
      { label: 'Yes, together', apply: pref('mental_health_integration', 'high') },
      { label: 'Only if I raise it', apply: pref('mental_health_integration', 'moderate') },
      { label: 'No, keep it separate', apply: pref('mental_health_integration', 'low') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'uncertainty',
    professions: ['gp'],
    target: { kind: 'preference', dimension: 'diagnostic_style' },
    text: "When something's unclear, what would you prefer?",
    options: [
      { label: 'Investigate further', apply: pref('diagnostic_style', 'investigative') },
      { label: 'Talk through the options', apply: pref('diagnostic_style', 'balanced') },
      { label: 'Give me a clear plan', apply: pref('diagnostic_style', 'pragmatic') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'medication',
    professions: ['gp'],
    target: { kind: 'preference', dimension: 'medication_philosophy' },
    text: 'If medication is an option, how do you usually feel about it?',
    options: [
      { label: 'Try other things first', apply: pref('medication_philosophy', 'conservative') },
      { label: 'Open to it', apply: pref('medication_philosophy', 'moderate') },
      { label: 'Keen to start early', apply: pref('medication_philosophy', 'proactive') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'follow_up',
    target: { kind: 'preference', dimension: 'follow_up_intensity' },
    text: 'Between visits, how much follow-up do you want?',
    options: [
      { label: 'Only when I ask', apply: pref('follow_up_intensity', 'as_needed') },
      { label: 'Regular check-ins', apply: pref('follow_up_intensity', 'scheduled') },
      { label: 'Proactive reminders', apply: pref('follow_up_intensity', 'proactive') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'continuity',
    target: { kind: 'preference', dimension: 'continuity' },
    // Seeing one psychologist is the norm, so this only matters when looking for a GP.
    professions: ['gp'],
    text: 'How important is seeing the same GP every time?',
    options: [
      { label: 'Very important', apply: pref('continuity', 'high') },
      { label: 'Nice but not essential', apply: pref('continuity', 'moderate') },
      { label: 'Not important', apply: pref('continuity', 'low') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'directness',
    target: { kind: 'preference', dimension: 'communication_directness' },
    text: 'How would you like difficult news delivered?',
    options: [
      { label: 'Straight to the point', apply: pref('communication_directness', 'direct') },
      { label: 'A bit of both', apply: pref('communication_directness', 'balanced') },
      { label: 'Gently, with context', apply: pref('communication_directness', 'gentle') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'therapy_style',
    professions: ['psychologist'],
    target: { kind: 'preference', dimension: 'therapy_style' },
    text: 'In sessions, what would help you most?',
    options: [
      { label: 'Practical strategies to try', apply: pref('therapy_style', 'practical') },
      { label: 'Understanding why things happen', apply: pref('therapy_style', 'exploratory') },
      { label: 'A mix of both', apply: pref('therapy_style', 'balanced') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'affirming',
    professions: ['psychologist'],
    target: { kind: 'preference', dimension: 'neurodiversity_affirming' },
    text: 'Would you like someone who treats ADHD, autism and other neurodivergence as a difference rather than something to fix?',
    options: [
      { label: 'Yes, that matters to me', apply: pref('neurodiversity_affirming', 'high') },
      { label: "I don't mind either way", apply: pref('neurodiversity_affirming', 'moderate') },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'cost',
    target: { kind: 'constraint', key: 'maxGap' },
    text: 'Do you need to keep the out-of-pocket cost below a certain amount?',
    options: [
      { label: 'Bulk billed only', apply: constraint({ maxGap: 0 }), prior: 0.2 },
      { label: 'Under $50 a visit', apply: constraint({ maxGap: 50 }), prior: 0.3 },
      { label: "Cost isn't a concern", apply: constraint({ maxGap: null }), prior: 0.5 },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'mode',
    target: { kind: 'constraint', key: 'mode' },
    text: 'Would telehealth appointments work for you?',
    options: [
      { label: 'Yes, telehealth is fine', apply: constraint({ mode: 'any' }), prior: 0.7 },
      { label: 'In person only', apply: constraint({ mode: 'in_person_only' }), prior: 0.2 },
      { label: 'Telehealth only', apply: constraint({ mode: 'telehealth_only' }), prior: 0.1 },
      { label: NOT_SURE },
    ],
  },
  {
    id: 'weekend',
    target: { kind: 'constraint', key: 'needsWeekend' },
    text: 'Do you need weekend appointments?',
    options: [
      { label: 'Yes, I need weekends', apply: constraint({ needsWeekend: true }), prior: 0.1 },
      { label: 'Weekdays are fine', apply: constraint({ needsWeekend: false }), prior: 0.9 },
      { label: NOT_SURE },
    ],
  },
];

export const questionById = (id: string) => QUESTIONS.find((q) => q.id === id);

/** Apply a patient's answer (by option label). Unknown labels and "Not sure" change nothing. */
export function applyAnswer(s: PatientSignals, questionId: string, label: string): PatientSignals {
  const opt = questionById(questionId)?.options.find((o) => o.label === label);
  return opt?.apply ? opt.apply(s) : s;
}
