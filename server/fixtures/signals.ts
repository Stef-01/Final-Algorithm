import type { PatientSignals } from '../engine/types';

// Hand-written patient signals: what the Phase 3 extractor should produce for each utterance.
// Used by the engine tests now and as expected outputs for the extraction evals later.

/** PRD §52 demo, before the follow-up question. */
export const demoSignals: PatientSignals = {
  clinicalNeeds: [
    { area: 'Adult ADHD', confidence: 'high', quote: "I've had GPs who technically know about ADHD" },
    { area: 'Sleep', confidence: 'high' },
    { area: 'Mental health', confidence: 'high' },
    { area: 'Work stress', confidence: 'medium' },
  ],
  preferences: {
    consultation_pace: { value: 'unhurried', confidence: 'high', quote: 'rushed appointments have not worked for you' },
    explanation_depth: { value: 'detailed', confidence: 'high', quote: "you want someone who'll explain why they're recommending something" },
    mental_health_integration: { value: 'high', confidence: 'high', quote: 'you want sleep, work stress and mental health looked at too' },
  },
  constraints: { age: 27 },
  complexity: 'multiple',
};

/** A patient who wants quick, efficient visits and clear direction. */
export const efficientSignals: PatientSignals = {
  clinicalNeeds: [{ area: "Men's health", confidence: 'high' }],
  preferences: {
    consultation_pace: { value: 'brisk', confidence: 'high', quote: 'you just want quick appointments' },
    shared_decision_making: { value: 'clinician_led', confidence: 'high', quote: 'you want to be told what to do' },
    communication_directness: { value: 'direct', confidence: 'high' },
  },
  constraints: { age: 30 },
};

/** Long-standing unexplained symptoms; wants investigation. */
export const investigateSignals: PatientSignals = {
  clinicalNeeds: [
    { area: 'Chronic pain', confidence: 'high' },
    { area: "Women's health", confidence: 'medium' },
  ],
  preferences: {
    diagnostic_style: { value: 'investigative', confidence: 'high', quote: 'no one has looked into it properly' },
    consultation_pace: { value: 'unhurried', confidence: 'high' },
    follow_up_intensity: { value: 'proactive', confidence: 'medium' },
  },
  constraints: { age: 34 },
  complexity: 'complex',
};

/** Almost nothing to go on yet. */
export const vagueSignals: PatientSignals = {
  clinicalNeeds: [],
  preferences: {},
  constraints: {},
};

export const urgentSignals: PatientSignals = {
  ...demoSignals,
  safetyFlag: { level: 'urgent', reason: 'chest pain' },
};
