import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { SavedItem } from '@/features/match/saved';
import { localDay } from '@/lib/day';

import type { TeamRole } from './plan';

// Medicare care plans, kept simple. General Australian rules (checked with a clinical advisor
// before launch, docs/safety.md): a GP mental health treatment plan gives up to 10 individual
// sessions a calendar year, with a GP review after the first 6; a GP chronic condition management
// plan gives up to 5 allied health visits a year. Counts come from the booking pages you've opened,
// so they're "booked", not claimed. Rebates are each practice's published fee minus their published
// out-of-pocket cost; nothing is guessed.

export type PlanId = 'mental' | 'chronic';

export const PLANS: { id: PlanId; title: string; sessions: number; covers: TeamRole[]; chips: string[] }[] = [
  { id: 'mental', title: 'Mental health plan', sessions: 10, covers: ['psychologist'], chips: ['10 sessions a year', 'GP review after 6'] },
  {
    id: 'chronic',
    title: 'Chronic care plan',
    sessions: 5,
    covers: ['physiotherapist', 'occupational_therapist', 'exercise_physiologist', 'dietitian'],
    chips: ['5 allied visits a year', 'Through your GP'],
  },
];

/** How often people usually see each kind of professional, for "next due" (days). */
const CADENCE: Partial<Record<TeamRole, number>> = { gp: 90, psychiatrist: 90 };
const DEFAULT_CADENCE = 14;

export const lastSeen = (item: SavedItem) => item.visits?.at(-1) ?? null;

export function nextDue(item: SavedItem, role: TeamRole): string | null {
  const last = lastSeen(item);
  if (!last) return null;
  const d = new Date(`${last}T00:00:00`);
  d.setDate(d.getDate() + (CADENCE[role] ?? DEFAULT_CADENCE));
  return localDay(d);
}

/** Visits booked this calendar year with the people a plan covers. */
export function booked(plan: (typeof PLANS)[number], team: { item: SavedItem; role: TeamRole }[], year = new Date().getFullYear()) {
  return team.filter((t) => plan.covers.includes(t.role)).reduce((n, t) => n + (t.item.visits ?? []).filter((d) => d.startsWith(String(year))).length, 0);
}

/** Money back per session, from the practice's own published numbers, or null. */
export const rebate = (fee: number | null, gap: number | null) => (fee !== null && gap !== null && fee > gap ? fee - gap : null);

const KEY = 'watl_plans';

/** Which plans you have (on this device only). */
export function usePlans() {
  const [plans, set] = useState<PlanId[]>([]);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const v: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(v)) set(v.filter((x): x is PlanId => x === 'mental' || x === 'chronic'));
      })
      .catch(() => {});
  }, []);
  const toggle = useCallback((id: PlanId) => {
    set((p) => {
      const next = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  return { plans, toggle };
}
