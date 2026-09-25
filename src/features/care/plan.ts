import type { Profession } from '@server/engine/types';

import type { IconName } from '@/components/icons';

// Goals, the care team they suggest, and a booking plan. Pure, so it's tested without screens.
// WATL doesn't see anyone's calendar or the practices' availability: the plan suggests when to
// book, and "Add to calendar" makes a reminder to do it.

export type Goal = { id: string; label: string; icon: IconName; /** Who tends to help, best first. */ professions: (Profession | 'dietitian')[] };

export const GOALS: Goal[] = [
  { id: 'assessed', label: 'Get assessed', icon: 'icQuestion', professions: ['gp', 'psychologist'] },
  { id: 'organised', label: 'Get organised', icon: 'icProCoach', professions: ['adhd_coach', 'occupational_therapist'] },
  { id: 'focus', label: 'Focus at work', icon: 'icLightningBoltBlack', professions: ['adhd_coach', 'psychologist'] },
  { id: 'medication', label: 'Review medication', icon: 'icProGp', professions: ['gp'] },
  { id: 'stress', label: 'Manage stress', icon: 'icProPsych', professions: ['psychologist', 'adhd_coach'] },
  { id: 'understand', label: 'Understand myself', icon: 'icProPsych', professions: ['psychologist'] },
  { id: 'sleep', label: 'Sleep better', icon: 'icClock', professions: ['gp', 'psychologist'] },
  { id: 'move', label: 'Move more', icon: 'icProExercise', professions: ['exercise_physiologist', 'physiotherapist'] },
  { id: 'pain', label: 'Less pain', icon: 'icProPhysio', professions: ['physiotherapist', 'exercise_physiologist'] },
  { id: 'eat', label: 'Eat well', icon: 'icProDiet', professions: ['dietitian'] },
  { id: 'child', label: 'Support my child', icon: 'icKids', professions: ['occupational_therapist', 'psychologist'] },
];

/** Care usually starts with a GP (assessment, referrals), then therapy, coaching and allied health. */
export const ORDER: (Profession | 'dietitian')[] = [
  'gp',
  'psychologist',
  'adhd_coach',
  'occupational_therapist',
  'physiotherapist',
  'exercise_physiologist',
  'dietitian',
  'neurotherapist',
];

export type TeamMember = { clinicianId: string; profession: Profession; name: string; firstName: string; bookingUrl: string | null };
export type Slot = { profession: Profession | 'dietitian'; member?: TeamMember };

/**
 * The care team: everyone saved, by profession, plus an empty slot for each profession the goals
 * point to that nobody saved fills yet. Ordered the way care usually starts.
 */
export function careTeam(saved: TeamMember[], goalIds: string[]): Slot[] {
  const slots: Slot[] = saved.map((m) => ({ profession: m.profession, member: m }));
  for (const g of GOALS.filter((x) => goalIds.includes(x.id))) {
    const first = g.professions.find((p) => !slots.some((s) => s.profession === p));
    const covered = g.professions.some((p) => slots.some((s) => s.profession === p));
    if (first && !covered) slots.push({ profession: first });
  }
  return slots.sort((a, b) => ORDER.indexOf(a.profession) - ORDER.indexOf(b.profession));
}

export type Step = { member: TeamMember; /** When to book, as a date. */ on: Date; label: string };

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 9, 0, 0);
const weekday = (d: Date) => (d.getDay() === 6 ? addDays(d, 2) : d.getDay() === 0 ? addDays(d, 1) : d);

/**
 * Suggested booking order: the first person in a couple of days, then one every two weeks, so
 * each starts once the last is under way. A reminder to book, not an appointment.
 */
export function bookingPlan(team: Slot[], today = new Date()): Step[] {
  const members = team.filter((s): s is Slot & { member: TeamMember } => !!s.member).map((s) => s.member);
  return members.map((member, i) => {
    const on = weekday(addDays(today, i === 0 ? 2 : 2 + i * 14));
    return { member, on, label: i === 0 ? 'This week' : i === 1 ? 'In 2 weeks' : `In ${i * 2} weeks` };
  });
}
