import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { track } from '@/lib/analytics';

import { GOALS } from './plan';

// The patient's goals (Profile tab). Ids only, on this device; no account.

const STORAGE_KEY = 'watl_goals';
const KNOWN = new Set(GOALS.map((g) => g.id));

/** Goal ids from storage: known ones only, once each. */
export const restoreGoals = (raw: unknown): string[] => (Array.isArray(raw) ? [...new Set(raw.filter((g): g is string => typeof g === 'string' && KNOWN.has(g)))] : []);

type Goals = { goals: string[]; toggle: (id: string) => void; has: (id: string) => boolean };
const GoalsContext = createContext<Goals | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<string[]>([]);
  const current = useRef(goals);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        current.current = restoreGoals(JSON.parse(raw));
        setGoals(current.current);
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback((id: string) => {
    if (!KNOWN.has(id)) return;
    const on = !current.current.includes(id);
    const next = on ? [...current.current, id] : current.current.filter((g) => g !== id);
    current.current = next;
    setGoals(next);
    track('goal_toggled', { goal: id, on });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<Goals>(() => ({ goals, toggle, has: (id) => goals.includes(id) }), [goals, toggle]);
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used inside GoalsProvider');
  return ctx;
}
