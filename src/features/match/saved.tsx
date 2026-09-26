import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { localDay } from '@/lib/day';

import type { FitLabel, Match } from './types';

// Clinicians the patient hearted (Liked), and their care team: opening someone's booking page puts
// them in the team and records the day (so the care plan can show when you last saw them). Kept on
// this device only; no account (PRD §4.12).
// Only the id, the fit label and the date are kept: a match's reasons repeat what the patient
// said about their health, and those stay with the search (24 h), not here (docs/privacy.md).

const STORAGE_KEY = 'watl_saved';

export type SavedItem = {
  clinicianId: string;
  fit: FitLabel;
  savedAt: string;
  /** In the care team, not just liked. */
  team?: true;
  /** Days you opened their booking page, oldest first (YYYY-MM-DD). */
  visits?: string[];
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Keep only what Saved needs (also strips reasons from anything saved by an older version). */
export const toSavedItem = (m: Pick<Match, 'clinicianId' | 'fit'> & { savedAt?: string; team?: boolean; visits?: unknown }, now = new Date()): SavedItem => {
  const visits = Array.isArray(m.visits) ? m.visits.filter((d): d is string => typeof d === 'string' && DAY_RE.test(d)).slice(-50) : [];
  return {
    clinicianId: m.clinicianId,
    fit: m.fit,
    savedAt: m.savedAt ?? localDay(now),
    ...(m.team ? { team: true as const } : {}),
    ...(visits.length ? { visits } : {}),
  };
};

const FITS: FitLabel[] = ['Strong fit', 'Good fit', 'Worth considering', 'Possible fit'];

/** Saved clinicians from storage: valid entries only, one per clinician, in the current shape. */
export function restoreSaved(raw: unknown): SavedItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedItem[] = [];
  for (const m of raw as Partial<SavedItem>[]) {
    if (!m || typeof m.clinicianId !== 'string' || !m.fit || !FITS.includes(m.fit)) continue;
    if (out.some((x) => x.clinicianId === m.clinicianId)) continue;
    out.push(toSavedItem({ clinicianId: m.clinicianId, fit: m.fit, savedAt: typeof m.savedAt === 'string' ? m.savedAt : undefined, team: m.team === true, visits: m.visits }));
  }
  return out;
}

type Saved = {
  saved: SavedItem[];
  isSaved: (clinicianId: string) => boolean;
  toggle: (match: Pick<Match, 'clinicianId' | 'fit'>) => void;
  inTeam: (clinicianId: string) => boolean;
  /** Add to the care team (liking them too if they weren't already), or take them out of it (still liked). */
  setTeam: (match: Pick<Match, 'clinicianId' | 'fit'>, on: boolean) => void;
  /** You opened their booking page: into the care team, with today's date recorded. */
  booked: (match: Pick<Match, 'clinicianId' | 'fit'>, day?: string) => void;
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

  const write = useCallback((next: SavedItem[]) => {
    current.current = next;
    setSaved(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const toggle = useCallback(
    (match: Pick<Match, 'clinicianId' | 'fit'>) => {
      const exists = current.current.some((m) => m.clinicianId === match.clinicianId);
      write(exists ? current.current.filter((m) => m.clinicianId !== match.clinicianId) : [...current.current, toSavedItem(match)]);
    },
    [write],
  );

  const setTeam = useCallback(
    (match: Pick<Match, 'clinicianId' | 'fit'>, on: boolean) => {
      const had = current.current.find((m) => m.clinicianId === match.clinicianId);
      const item = toSavedItem({ ...(had ?? match), team: on });
      write(had ? current.current.map((m) => (m === had ? item : m)) : [...current.current, item]);
    },
    [write],
  );

  const booked = useCallback(
    (match: Pick<Match, 'clinicianId' | 'fit'>, day = localDay()) => {
      const had = current.current.find((m) => m.clinicianId === match.clinicianId);
      const visits = [...(had?.visits ?? []).filter((d) => d !== day), day];
      const item = toSavedItem({ ...(had ?? match), team: true, visits });
      write(had ? current.current.map((m) => (m === had ? item : m)) : [...current.current, item]);
    },
    [write],
  );

  const value = useMemo<Saved>(
    () => ({
      saved,
      toggle,
      setTeam,
      booked,
      isSaved: (id) => saved.some((m) => m.clinicianId === id),
      inTeam: (id) => saved.some((m) => m.clinicianId === id && m.team),
    }),
    [saved, toggle, setTeam, booked],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside SavedProvider');
  return ctx;
}
