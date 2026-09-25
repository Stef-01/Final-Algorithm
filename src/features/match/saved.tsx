import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { Match } from './types';

// Clinicians the patient hearted. Kept on this device only; no account (PRD §4.12).

const STORAGE_KEY = 'watl_saved';

type Saved = {
  saved: Match[];
  isSaved: (clinicianId: string) => boolean;
  toggle: (match: Match) => void;
};

const SavedContext = createContext<Saved | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Match[]>([]);
  const current = useRef(saved);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        current.current = JSON.parse(raw);
        setSaved(current.current);
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback((match: Match) => {
    const exists = current.current.some((m) => m.clinicianId === match.clinicianId);
    const next = exists
      ? current.current.filter((m) => m.clinicianId !== match.clinicianId)
      : [...current.current, match];
    current.current = next;
    setSaved(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<Saved>(
    () => ({ saved, toggle, isSaved: (id) => saved.some((m) => m.clinicianId === id) }),
    [saved, toggle],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside SavedProvider');
  return ctx;
}
