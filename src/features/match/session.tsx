import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as core from './sessionCore';
import type { NoMatchAction } from './types';

const STORAGE_KEY = 'watl_session';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // PRD §45: keep free text only as long as needed.

type Session = {
  state: core.SessionState;
  loaded: boolean;
  submitText: (text: string) => string;
  answer: (questionId: string, value: string) => string;
  confirmPriorities: (removed: string[]) => string;
  acknowledgeSafety: () => string;
  match: () => string;
  nextMatch: () => void;
  showMore: () => void;
  noMatchAction: (action: NoMatchAction) => string;
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
        const saved: core.SessionState = JSON.parse(raw);
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
      submitText: (text) => route(core.submitText(current.current, text)),
      answer: (q, v) => route(core.answer(current.current, q, v)),
      confirmPriorities: (removed) => route(core.confirmPriorities(current.current, removed)),
      acknowledgeSafety: () => route(core.acknowledgeSafety(current.current)),
      match: () => route(core.match(current.current)),
      nextMatch: () => commit(core.nextMatch(current.current)),
      showMore: () => commit(core.showMore(current.current)),
      noMatchAction: (a) => route(core.noMatchAction(current.current, a)),
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
