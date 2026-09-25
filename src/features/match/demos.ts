import type { PatientSignals, Profession } from '@server/engine/types';

// Demo run-throughs: scripted patients whose signals are written by hand (what the Claude extractor
// should produce in the final phase). Each one runs through the real engine against the real
// ADHDme profiles, and each shows a different path through the flow.

export type Demo = {
  id: string;
  profession: Profession | 'either';
  title: string;
  /** What this run-through shows, for testers. */
  shows: string;
  text: string;
  signals: PatientSignals;
};

const BRISBANE = { lat: -27.457, lng: 153.034 };
const GOLD_COAST = { lat: -28.009, lng: 153.405 };

export const DEMO_TEXT =
  "I've had GPs who technically know about ADHD, but appointments always feel rushed. I don't just want medication reviews. I want someone who can look at sleep, work stress and mental health too, and actually explain why they're recommending something.";

export const demos: Demo[] = [
  {
    id: 'gp-rushed',
    profession: 'gp',
    title: 'ADHD care that isn’t rushed',
    shows: 'The PRD demo, run against the two GPs in the network.',
    text: DEMO_TEXT,
    signals: {
      profession: 'gp',
      clinicalNeeds: [
        { area: 'ADHD', confidence: 'high' },
        { area: 'Sleep', confidence: 'high' },
        { area: 'Mental health', confidence: 'high' },
        { area: 'Stress', confidence: 'medium' },
      ],
      preferences: {
        consultation_pace: { value: 'unhurried', confidence: 'high', quote: 'appointments always feel rushed' },
        explanation_depth: { value: 'detailed', confidence: 'high', quote: "you want someone who'll explain why they're recommending something" },
        mental_health_integration: { value: 'high', confidence: 'high', quote: 'you want sleep, work stress and mental health looked at too' },
        medication_philosophy: { value: 'conservative', confidence: 'medium', quote: "you don't just want medication reviews" },
      },
      constraints: {},
      complexity: 'multiple',
    },
  },
  {
    id: 'gp-female',
    profession: 'gp',
    title: 'A female GP for ADHD and women’s health',
    shows: 'An explicit request (female GP) narrowing the list to one.',
    text: "I'd like a female GP who understands ADHD and can also help with women's health things like my hormones and periods.",
    signals: {
      profession: 'gp',
      clinicalNeeds: [
        { area: 'ADHD', confidence: 'high' },
        { area: "Women's health", confidence: 'high' },
      ],
      preferences: {},
      constraints: { clinicianGender: 'female' },
    },
  },
  {
    id: 'psych-masking',
    profession: 'psychologist',
    title: 'Burnt out from masking',
    shows: 'One follow-up question, then matches explained by what you said about anxiety and masking.',
    text: "I'm 26 and I think I've been masking my ADHD for years. I'm burnt out and anxious. I don't want someone who just hands me a list of strategies. I want to understand why things feel so hard.",
    signals: {
      profession: 'psychologist',
      clinicalNeeds: [
        { area: 'ADHD', confidence: 'high' },
        { area: 'Neurodivergent adults', confidence: 'high' },
        { area: 'Burnout', confidence: 'high' },
        { area: 'Anxiety', confidence: 'high' },
      ],
      preferences: {
        therapy_style: { value: 'exploratory', confidence: 'high', quote: 'you want to understand why things feel so hard' },
        neurodiversity_affirming: { value: 'high', confidence: 'medium', quote: "you've been masking for years" },
      },
      constraints: { age: 26 },
      complexity: 'complex',
    },
  },
  {
    id: 'psych-practical',
    profession: 'psychologist',
    title: 'Practical help with uni stress, in Brisbane',
    shows: 'In-person only, near Brisbane, wanting practical strategies.',
    text: "I'm 22 and I get really stressed at uni. I want practical strategies I can use day to day, and I'd like to go in person in Brisbane.",
    signals: {
      profession: 'psychologist',
      clinicalNeeds: [
        { area: 'Stress', confidence: 'high' },
        { area: 'Young people', confidence: 'medium' },
      ],
      preferences: {
        therapy_style: { value: 'practical', confidence: 'high', quote: 'you want practical strategies you can use day to day' },
      },
      constraints: { age: 22, mode: 'in_person_only', origin: BRISBANE, maxKm: 15 },
    },
  },
  {
    id: 'psych-assessment',
    profession: 'psychologist',
    title: 'Getting assessed for ADHD',
    shows: 'Assessment specialists come first; a follow-up question may help choose.',
    text: "I'm 30 and I want to be assessed for ADHD, and maybe autism too. I'd like it done properly.",
    signals: {
      profession: 'psychologist',
      clinicalNeeds: [
        { area: 'ADHD assessment', confidence: 'high' },
        { area: 'Autism assessment', confidence: 'medium' },
      ],
      preferences: {},
      constraints: { age: 30 },
    },
  },
  {
    id: 'psych-trauma-online',
    profession: 'psychologist',
    title: 'Trauma, online sessions only',
    shows: 'Telehealth-only constraint with a collaborative preference.',
    text: "I've been through a lot of trauma and I'd rather do sessions online only. I want someone collaborative, where we work things out together.",
    signals: {
      profession: 'psychologist',
      clinicalNeeds: [{ area: 'Trauma', confidence: 'high' }],
      preferences: {
        shared_decision_making: { value: 'shared', confidence: 'high', quote: 'you want to work things out together' },
      },
      constraints: { mode: 'telehealth_only' },
    },
  },
  {
    id: 'psych-gold-coast',
    profession: 'psychologist',
    title: 'Straight talk about work pressure, Gold Coast',
    shows: 'In person on the Gold Coast, direct communication.',
    text: "I'm on the Gold Coast and I want someone straight-talking to help with work performance pressure. In person, please.",
    signals: {
      profession: 'psychologist',
      clinicalNeeds: [{ area: 'Career and performance', confidence: 'high' }],
      preferences: {
        communication_directness: { value: 'direct', confidence: 'high', quote: 'you want someone straight-talking' },
      },
      constraints: { mode: 'in_person_only', origin: GOLD_COAST, maxKm: 20 },
    },
  },
  {
    id: 'psych-bulk-billed',
    profession: 'psychologist',
    title: 'A bulk-billed psychologist',
    shows: 'Bulk billing required: nobody publishes it, so those with an unpublished fee are listed with the cost flagged to check, and anyone with a known fee is left out.',
    text: 'I need a psychologist who bulk bills. I have ADHD and anxiety.',
    signals: {
      profession: 'psychologist',
      clinicalNeeds: [
        { area: 'ADHD', confidence: 'high' },
        { area: 'Anxiety', confidence: 'high' },
      ],
      preferences: {},
      constraints: { maxGap: 0 },
    },
  },
  {
    id: 'coach-organised',
    profession: 'adhd_coach',
    title: 'Getting organised, with a coach',
    shows: 'An ADHD coach search: executive functioning, online, and a neurodiversity-affirming preference.',
    text: "I've got ADHD and I procrastinate on everything. I'd love a coach to help me get organised and build routines that stick, online is easiest. I want someone who gets that my brain works differently.",
    signals: {
      profession: 'adhd_coach',
      clinicalNeeds: [
        { area: 'ADHD', confidence: 'high' },
        { area: 'Executive functioning', confidence: 'high' },
      ],
      preferences: {
        neurodiversity_affirming: { value: 'high', confidence: 'medium', quote: 'you want someone who gets that your brain works differently' },
      },
      constraints: { mode: 'telehealth_only' },
    },
  },
  {
    id: 'physio-back',
    profession: 'physiotherapist',
    title: 'Back pain on the Gold Coast',
    shows: 'A physiotherapist search: chronic pain, in person near Southport.',
    text: "I've had lower back pain for months and it's stopping me training. I live near Southport and want to see someone in person who can get me back to sport.",
    signals: {
      profession: 'physiotherapist',
      clinicalNeeds: [
        { area: 'Chronic pain', confidence: 'high' },
        { area: 'Injury recovery', confidence: 'high' },
        { area: 'Return to sport', confidence: 'medium' },
      ],
      preferences: {},
      constraints: { mode: 'in_person_only', origin: GOLD_COAST, originLabel: 'Southport', maxKm: 15 },
    },
  },
  {
    id: 'ot-child',
    profession: 'occupational_therapist',
    title: 'Sensory support for a child',
    shows: 'An occupational therapy search for a child: sensory needs, school visits, Brisbane.',
    text: 'My son is 7, autistic, and gets overwhelmed by noise and clothes. School is hard. I want an OT in Brisbane who can visit school too.',
    signals: {
      profession: 'occupational_therapist',
      clinicalNeeds: [
        { area: 'Children', confidence: 'high' },
        { area: 'Sensory and daily living', confidence: 'high' },
        { area: 'Autism', confidence: 'high' },
      ],
      preferences: {},
      constraints: { age: 7, origin: BRISBANE, originLabel: 'Brisbane', maxKm: 15 },
    },
  },
  {
    id: 'either-unsure',
    profession: 'either',
    title: 'Not sure what I need yet',
    shows: 'Very little to go on, so the engine asks the questions that matter most.',
    text: 'I just need some help, I’m not sure where to start.',
    signals: { clinicalNeeds: [], preferences: {}, constraints: {} },
  },
  {
    id: 'either-urgent',
    profession: 'either',
    title: 'An urgent symptom',
    shows: 'The safety pause before anything else.',
    text: "I've had chest pain since this morning and I need to see someone.",
    signals: { clinicalNeeds: [], preferences: {}, constraints: {}, safetyFlag: { level: 'urgent', reason: 'chest pain' } },
  },
];

export const demoById = (id: string) => demos.find((d) => d.id === id);
