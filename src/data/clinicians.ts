import type { Clinician } from '@/features/match/types';

// Fictional clinicians for prototype testing. They are not real people and the
// portraits are illustrations. Evidence lines stand in for reviewed interview
// evidence (docs/PLAN.md §8) until the clinician pipeline exists.

export const clinicians: Clinician[] = [
  {
    id: 'amy-chen',
    name: 'Dr Amy Chen',
    firstName: 'Amy',
    role: 'GP',
    suburb: 'New Farm',
    city: 'Brisbane',
    photo: require('../../assets/clinicians/amy-chen.png'),
    bio: 'Amy has worked in general practice for 12 years and sees many young adults with ADHD. She splits her week between the New Farm clinic and telehealth.',
    credentials: ['MBBS, University of Queensland', 'FRACGP'],
    practical: {
      nextAvailableShort: 'Tomorrow',
      nextAvailable: 'Tomorrow, 3:30 pm',
      modes: ['In person', 'Telehealth'],
      fee: 120,
      gapAfterMedicare: 42,
      weekends: false,
    },
    experiencedWith: ['Adult ADHD', 'Sleep', 'Mental health', "Women's health"],
    practiceStyle: ['Collaborative', 'Direct', 'Longer first visits', 'Comfortable with complexity', 'Active follow-up'],
    evidence: [
      {
        id: 'amy-pace',
        trait: 'consultation_pace',
        patientFacing: 'Amy books 30-minute first appointments and keeps the end of each visit to agree on next steps.',
      },
      {
        id: 'amy-integration',
        trait: 'mental_health_integration',
        patientFacing: 'Amy works through ADHD, sleep and mental health in one plan rather than as separate problems.',
      },
      {
        id: 'amy-sdm',
        trait: 'shared_decision_making',
        patientFacing: 'Amy explains the trade-offs of two or three options before agreeing on a plan with you.',
      },
      {
        id: 'amy-direct',
        trait: 'communication_directness',
        patientFacing: "Amy tells you which option she'd choose and why, then checks it suits you.",
      },
      {
        id: 'amy-autonomy',
        trait: 'patient_autonomy',
        patientFacing: 'Amy lays out the options with what each involves, then leaves the choice with you.',
      },
      {
        id: 'amy-explain',
        trait: 'explanation_depth',
        patientFacing: 'Amy explains the reasoning behind each recommendation before you leave.',
      },
    ],
  },
  {
    id: 'priya-nair',
    name: 'Dr Priya Nair',
    firstName: 'Priya',
    role: 'GP',
    suburb: 'Paddington',
    city: 'Brisbane',
    photo: require('../../assets/clinicians/priya-nair.png'),
    bio: 'Priya has a particular interest in adult ADHD, anxiety and mood. She runs a bulk-billed clinic two days a week.',
    credentials: ['MBBS, Monash University', 'FRACGP', 'Graduate Certificate in Mental Health'],
    practical: {
      nextAvailableShort: 'Thu',
      nextAvailable: 'Thursday, 10:15 am',
      modes: ['In person', 'Telehealth'],
      fee: 0,
      gapAfterMedicare: 0,
      weekends: false,
    },
    experiencedWith: ['Adult ADHD', 'Anxiety', 'Mood', 'Sleep'],
    practiceStyle: ['Structured', 'Explains reasoning', 'Written plans', 'Regular reviews'],
    evidence: [
      {
        id: 'priya-adhd',
        trait: 'clinical_expertise',
        patientFacing: 'Priya reviews sleep and work stress at every ADHD appointment, not just medication.',
      },
      {
        id: 'priya-explain',
        trait: 'explanation_depth',
        patientFacing: 'Priya sends a written summary of the plan and the reasons for it after each visit.',
      },
      {
        id: 'priya-sdm',
        trait: 'shared_decision_making',
        patientFacing: 'Priya goes through the options with you and agrees on a plan together.',
      },
      {
        id: 'priya-direct',
        trait: 'communication_directness',
        patientFacing: 'Priya gives a clear recommendation and writes down why.',
      },
      {
        id: 'priya-autonomy',
        trait: 'patient_autonomy',
        patientFacing: 'Priya explains each option in writing so you can decide in your own time.',
      },
    ],
  },
  {
    id: 'tom-walsh',
    name: 'Dr Tom Walsh',
    firstName: 'Tom',
    role: 'GP',
    suburb: 'West End',
    city: 'Brisbane',
    photo: require('../../assets/clinicians/tom-walsh.png'),
    bio: 'Tom has worked in general practice for eight years, mostly with university students and young professionals.',
    credentials: ['MBBS, James Cook University', 'FRACGP'],
    practical: {
      nextAvailableShort: 'Fri',
      nextAvailable: 'Friday, 4:45 pm',
      modes: ['In person', 'Telehealth'],
      fee: 0,
      gapAfterMedicare: 0,
      weekends: false,
    },
    experiencedWith: ['Adult ADHD', 'Work stress', 'Mental health'],
    practiceStyle: ['Explains reasoning', 'Unhurried', 'Collaborative', 'Visual explanations'],
    evidence: [
      {
        id: 'tom-pace',
        trait: 'consultation_pace',
        patientFacing: "Tom leaves a 15-minute buffer after first appointments so they don't get cut short.",
      },
      {
        id: 'tom-explain',
        trait: 'explanation_depth',
        patientFacing: 'Tom sketches out the options during the visit so you can see the reasoning.',
      },
      {
        id: 'tom-sdm',
        trait: 'shared_decision_making',
        patientFacing: 'Tom talks through the pros and cons of each option and decides with you.',
      },
      {
        id: 'tom-direct',
        trait: 'communication_directness',
        patientFacing: 'Tom tells you plainly what he recommends and what would change his mind.',
      },
      {
        id: 'tom-autonomy',
        trait: 'patient_autonomy',
        patientFacing: 'Tom explains the options and is comfortable with you choosing.',
      },
    ],
  },
  {
    id: 'grace-okafor',
    name: 'Dr Grace Okafor',
    firstName: 'Grace',
    role: 'GP',
    suburb: 'Toowong',
    city: 'Brisbane',
    photo: require('../../assets/clinicians/grace-okafor.png'),
    bio: 'Grace works in a practice that shares care with an on-site psychologist, and offers evening telehealth.',
    credentials: ['MBBS, University of Sydney', 'FRACGP'],
    practical: {
      nextAvailableShort: 'Next week',
      nextAvailable: 'Monday, 6:30 pm',
      modes: ['Telehealth'],
      fee: 130,
      gapAfterMedicare: 60,
      weekends: true,
    },
    experiencedWith: ['Mental health', 'Adult ADHD'],
    practiceStyle: ['Shared care with a psychologist', 'Evening telehealth'],
    evidence: [
      {
        id: 'grace-shared-care',
        trait: 'care_coordination',
        patientFacing: 'Grace works alongside a psychologist in the same practice and shares a plan with them.',
      },
      {
        id: 'grace-pace',
        trait: 'consultation_pace',
        patientFacing: 'Grace offers 40-minute telehealth appointments in the evenings.',
      },
    ],
  },
];

export function getClinician(id: string) {
  return clinicians.find((c) => c.id === id);
}
