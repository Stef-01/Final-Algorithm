import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { track, wordCount } from '@/lib/analytics';

import * as core from './sessionCore';
import type { NoMatchAction } from './types';

const STORAGE_KEY = 'watl_session';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // PRD §45: keep free text only as long as needed.

type Session = {
  state: core.SessionState;
  loaded: boolean;
  chooseProfession: (p: core.ProfessionChoice) => string;
  startDemo: (demoId: string) => string;
  submitText: (text: string) => string;
  answer: (questionId: string, value: string) => string;
  confirmPriorities: (removed: string[]) => string;
  acknowledgeSafety: () => string;
  match: () => string;
  nextMatch: () => void;
  showMore: () => void;
  noMatchAction: (action: NoMatchAction) => string;
  rateMatches: (rating: number) => void;
  thumb: (clinicianId: string, dir: 'up' | 'down') => void;
  reset: () => void;
  load: (state: core.SessionState) => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<core.SessionState>(core.initialState);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(state);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved: core.SessionState = { feedback: { thumbs: {} }, ...JSON.parse(raw) };
        if (Date.now() - saved.updatedAt > MAX_AGE_MS) return AsyncStorage.removeItem(STORAGE_KEY);
        current.current = saved;
        setState(saved);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const commit = useCallback((next: core.SessionState) => {
    current.current = next;
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const route = useCallback(
    (t: core.Transition) => {
      commit(t.state);
      return t.route;
    },
    [commit],
  );

  const value = useMemo<Session>(
    () => ({
      state,
      loaded,
      chooseProfession: (p) => route(core.chooseProfession(current.current, p)),
      startDemo: (id) => route(core.startDemo(current.current, id)),
      submitText: (text) => {
        const t = core.submitText(current.current, text);
        track('text_submitted', { words: wordCount(text) });
        track('matching_started', { profession: t.state.profession ?? 'either', demo: !!t.state.input.demoId });
        return route(t);
      },
      answer: (q, v) => {
        const t = core.answer(current.current, q, v);
        track('followup_answered', { question: q, ownWords: t.state.input.answers[q] !== v });
        return route(t);
      },
      confirmPriorities: (removed) => route(core.confirmPriorities(current.current, removed)),
      acknowledgeSafety: () => route(core.acknowledgeSafety(current.current)),
      match: () => {
        const t = core.match(current.current);
        const r = t.state.result;
        track('matching_completed', {
          matches: r?.status === 'matches' ? r.matches.length : 0,
          followups: t.state.asked.length,
          seconds: core.secondsToShortlist(t.state),
          profession: t.state.profession ?? 'either',
        });
        return route(t);
      },
      nextMatch: () => {
        const next = core.nextMatch(current.current);
        track('next_match_viewed', { position: next.index + 1 });
        commit(next);
      },
      showMore: () => commit(core.showMore(current.current)),
      noMatchAction: (a) => route(core.noMatchAction(current.current, a)),
      rateMatches: (rating) => {
        const next = core.rateMatches(current.current, rating);
        const r = next.result;
        track('match_rating', { rating: next.feedback.rating!, matches: r?.status === 'matches' ? r.matches.length : 0 });
        commit(next);
      },
      thumb: (id, dir) => {
        track(dir === 'up' ? 'match_feedback_positive' : 'match_feedback_negative', { clinician: id });
        commit(core.thumb(current.current, id, dir));
      },
      reset: () => {
        commit(core.initialState());
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      },
      load: commit,
    }),
    [state, loaded, route, commit],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
