import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { FitLabel, Match } from './types';

// Clinicians the patient hearted. Kept on this device only; no account (PRD §4.12).
// Only the id, the fit label and the date are kept: a match's reasons repeat what the patient
// said about their health, and those stay with the search (24 h), not here (docs/privacy.md).

const STORAGE_KEY = 'watl_saved';

export type SavedItem = { clinicianId: string; fit: FitLabel; savedAt: string };

/** Keep only what Saved needs (also strips reasons from anything saved by an older version). */
export const toSavedItem = (m: Pick<Match, 'clinicianId' | 'fit'> & { savedAt?: string }, now = new Date()): SavedItem => ({
  clinicianId: m.clinicianId,
  fit: m.fit,
  savedAt: m.savedAt ?? now.toISOString().slice(0, 10),
});

const FITS: FitLabel[] = ['Strong fit', 'Good fit', 'Worth considering', 'Possible fit'];

/** Saved clinicians from storage: valid entries only, one per clinician, in the current shape. */
export function restoreSaved(raw: unknown): SavedItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedItem[] = [];
  for (const m of raw as Partial<SavedItem>[]) {
    if (!m || typeof m.clinicianId !== 'string' || !m.fit || !FITS.includes(m.fit)) continue;
    if (out.some((x) => x.clinicianId === m.clinicianId)) continue;
    out.push(toSavedItem({ clinicianId: m.clinicianId, fit: m.fit, savedAt: typeof m.savedAt === 'string' ? m.savedAt : undefined }));
  }
  return out;
}

type Saved = {
  saved: SavedItem[];
  isSaved: (clinicianId: string) => boolean;
  toggle: (match: Pick<Match, 'clinicianId' | 'fit'>) => void;
};

const SavedContext = createContext<Saved | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const current = useRef(saved);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        current.current = restoreSaved(parsed);
        setSaved(current.current);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current.current)).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback((match: Pick<Match, 'clinicianId' | 'fit'>) => {
    const exists = current.current.some((m) => m.clinicianId === match.clinicianId);
    const next = exists
      ? current.current.filter((m) => m.clinicianId !== match.clinicianId)
      : [...current.current, toSavedItem(match)];
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
