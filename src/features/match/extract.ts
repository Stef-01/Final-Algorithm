import type { Confidence, Dimension, PatientSignals, Preference, Profession } from '@server/engine/types';

// Stand-in for the Claude extractor (final phase, docs/PLAN.md §12): deterministic keyword rules that
// turn what the patient typed into PatientSignals. Deliberately modest — preferences it picks up are
// "medium" confidence, so the engine confirms or asks when a guess would matter.

const NEEDS: [RegExp, string][] = [
  [/\badhd\b|attention deficit/, 'ADHD'],
  [/adhd (assessment|diagnos)|(assess|diagnos)\w* (for|of) adhd|get (an? )?adhd diagnosis/, 'ADHD assessment'],
  [/autis|asd\b/, 'Autism'],
  [/autism (assessment|diagnos)|(assess|diagnos)\w* (for|of) autism/, 'Autism assessment'],
  [/neurodiverg|neurodivers/, 'Neurodivergent adults'],
  [/anxi/, 'Anxiety'],
  [/depress|low mood|feeling low|been (really |so |very )?low|really low/, 'Depression'],
  [/trauma|ptsd/, 'Trauma'],
  [/burn ?out|burnt out/, 'Burnout'],
  [/stress/, 'Stress'],
  [/relationship/, 'Relationships'],
  [/self[- ]esteem|confidence/, 'Self-esteem'],
  [/emotion\w* regulat|meltdown|overwhelm/, 'Emotional regulation'],
  [/eating disorder|anorexi|bulimi|binge/, 'Eating disorders'],
  [/perinatal|postnatal|pregnan|new (mum|mother|parent)|fertility|had a baby|newborn/, 'Perinatal mental health'],
  [/parenting|my (teenage |young |little )?(son|daughter|child|kid)/, 'Parenting support'],
  [/\b(child|children|kid|toddler)\b/, 'Children'],
  [/teen|young person|young people/, 'Young people'],
  [/career|work performance|performance/, 'Career and performance'],
  [/transition|retir|moving country/, 'Life transitions'],
  [/refugee|migrant|newly arrived|cald\b/, 'Refugee and CALD clients'],
  [/ndis/, 'NDIS support'],
  [/mental health/, 'Mental health'],
  [/women'?s health|contracept|period|menopaus|hormon/, "Women's health"],
  [/sleep|insomnia/, 'Sleep'],
  [/heart|blood pressure|cholesterol|metabolic/, 'Heart and metabolic health'],
  [/cognitive assess|iq test/, 'Cognitive assessment'],
];

type PrefRule = [RegExp, Dimension, string];

const PREFS: PrefRule[] = [
  [/rush|hurried|more time|longer (appointment|session|consult)/, 'consultation_pace', 'unhurried'],
  [/quick|efficient|in and out/, 'consultation_pace', 'brisk'],
  [/explain|why they|reasoning/, 'explanation_depth', 'detailed'],
  [/decide together|together|collaborat|talk (it|things) through/, 'shared_decision_making', 'shared'],
  [/tell me what to do|just recommend|clear recommendation/, 'shared_decision_making', 'clinician_led'],
  [/my (own )?choice|let me decide|decide for myself/, 'shared_decision_making', 'patient_led'],
  [/straight|blunt|direct|no fluff/, 'communication_directness', 'direct'],
  [/gentle|\bkind\b(?! of)|soft[- ]spoken|softly/, 'communication_directness', 'gentle'],
  [/look(ed)? into it|investigat|get to the bottom|answers|properly checked/, 'diagnostic_style', 'investigative'],
  [/(don'?t|do not|without|not keen on|avoid) (want )?(more )?medication|not just medication|more than medication/, 'medication_philosophy', 'conservative'],
  [/sleep|exercise|lifestyle|nutrition|diet|routine/, 'lifestyle_integration', 'high'],
  [/mental health (too|as well|alongside)|look at .*mental health|everything together|whole picture/, 'mental_health_integration', 'high'],
  [/same (doctor|gp|psychologist)|continuity|stick with/, 'continuity', 'high'],
  [/check[- ]in|follow[- ]up|keep on top/, 'follow_up_intensity', 'scheduled'],
  [/strateg|practical|tools|skills|what to do day to day/, 'therapy_style', 'practical'],
  [/understand why|understand myself|make sense of|explore/, 'therapy_style', 'exploratory'],
  [/affirm|not (be )?fixed|difference,? not a deficit|mask/, 'neurodiversity_affirming', 'high'],
  [/coordinat|talk to my (psychologist|psychiatrist|gp|dietitian)|team/, 'care_coordination', 'high'],
];

const PLACES: [RegExp, { lat: number; lng: number }][] = [
  [/fortitude valley|the valley|brisbane cbd|brisbane city/, { lat: -27.457, lng: 153.034 }],
  [/ashgrove|paddington|red hill/, { lat: -27.444, lng: 152.986 }],
  [/new farm|west end|kangaroo point|woolloongabba/, { lat: -27.47, lng: 153.03 }],
  [/brisbane/, { lat: -27.47, lng: 153.02 }],
  [/gold coast|bundall|surfers|southport/, { lat: -28.009, lng: 153.405 }],
  [/double bay|bondi|eastern suburbs/, { lat: -33.877, lng: 151.243 }],
  [/beecroft|hornsby|north shore/, { lat: -33.749, lng: 151.064 }],
  [/sydney/, { lat: -33.87, lng: 151.2 }],
];

const URGENT = [/chest pain/, /suicid/, /kill myself/, /self[- ]harm/, /overdos/, /can'?t breathe|cannot breathe/, /emergency/];

/** Matches `re` somewhere it isn't negated ("it's not anxiety", "I'm not depressed"). */
function mentioned(t: string, re: RegExp): boolean {
  const g = new RegExp(re.source, 'g');
  for (const m of t.matchAll(g)) {
    const before = t.slice(Math.max(0, m.index - 16), m.index);
    if (!/\b(not|no|isn'?t|never|without)\s+(\w+\s+)?$/.test(before)) return true;
  }
  return false;
}

export const isUrgent = (text: string) => URGENT.some((p) => p.test(text.toLowerCase()));

export function extractSignals(raw: string, profession?: Profession): PatientSignals {
  const t = raw.toLowerCase();
  const clinicalNeeds = NEEDS.filter(([re]) => mentioned(t, re)).map(([, area]) => ({
    area,
    confidence: 'high' as Confidence,
  }));
  // ADHD or autism mentioned: also look for clinicians who focus on neurodivergent adults.
  if (clinicalNeeds.some((n) => n.area === 'ADHD' || n.area === 'Autism') && !clinicalNeeds.some((n) => n.area === 'Neurodivergent adults')) {
    clinicalNeeds.push({ area: 'Neurodivergent adults', confidence: 'medium' });
  }

  const preferences: Partial<Record<Dimension, Preference>> = {};
  for (const [re, dim, value] of PREFS) {
    if (preferences[dim] || !re.test(t)) continue;
    // No quotes: patient-facing quotes come from the Claude extractor in the final phase.
    preferences[dim] = { value, confidence: 'medium' };
  }

  const constraints: PatientSignals['constraints'] = {};
  if (/bulk.?bill|no gap|can'?t afford/.test(t)) constraints.maxGap = 0;
  if (/weekend|saturday|sunday/.test(t)) constraints.needsWeekend = true;
  if (/telehealth only|online only|only (by )?(video|telehealth|online)/.test(t)) constraints.mode = 'telehealth_only';
  else if (/in[- ]person|face to face/.test(t)) constraints.mode = 'in_person_only';
  if (/(female|woman|women) (gp|doctor|psychologist)/.test(t)) constraints.clinicianGender = 'female';
  if (/(male|man) (gp|doctor|psychologist)/.test(t) && !/female|woman/.test(t)) constraints.clinicianGender = 'male';
  const age = t.match(/\bi'?m (\d{2})\b|\b(\d{2}) ?(years old|yo)\b/);
  if (age) constraints.age = Number(age[1] ?? age[2]);
  const place = PLACES.find(([re]) => re.test(t));
  if (place && /near|close to|around|\blive|based|located|i'?m in|work in/.test(t)) {
    constraints.origin = place[1];
    constraints.maxKm = /walking|very close/.test(t) ? 5 : 15;
  }
  const languages = ['hindi', 'urdu', 'vietnamese', 'mandarin', 'arabic'].filter((l) => t.includes(l));
  if (languages.length) constraints.languages = languages.map((l) => l[0].toUpperCase() + l.slice(1));

  const signals: PatientSignals = { profession, clinicalNeeds, preferences, constraints };
  if (isUrgent(t)) signals.safetyFlag = { level: 'urgent', reason: 'urgent wording' };
  const n = clinicalNeeds.filter((x) => x.confidence === 'high').length;
  if (n >= 2) signals.complexity = n >= 4 ? 'complex' : 'multiple';
  return signals;
}

/** Combine signals from later turns (e.g. an answer in the patient's own words) into earlier ones. */
export function mergeSignals(a: PatientSignals, b: PatientSignals): PatientSignals {
  const needs = [...a.clinicalNeeds];
  for (const n of b.clinicalNeeds) if (!needs.some((x) => x.area === n.area)) needs.push(n);
  return {
    ...a,
    clinicalNeeds: needs,
    preferences: { ...b.preferences, ...a.preferences },
    constraints: { ...b.constraints, ...a.constraints },
    safetyFlag: a.safetyFlag ?? b.safetyFlag,
  };
}
