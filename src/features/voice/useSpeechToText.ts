import { useCallback, useEffect, useRef, useState } from 'react';

import { getRecognitionCtor } from './recognition';
import { SpeechSession } from './speechSession';

export type SpeechToText = {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error?: string;
  start: () => void;
  done: () => void;
  cancel: () => void;
};

/** Voice input where the browser supports it; `supported: false` means show text only (PRD §4.10). */
export function useSpeechToText(onFinished?: (transcript: string) => void): SpeechToText {
  const [Ctor] = useState(getRecognitionCtor);
  const [state, setState] = useState<{ listening: boolean; transcript: string; error?: string }>({
    listening: false,
    transcript: '',
  });
  const session = useRef<SpeechSession | null>(null);
  const finished = useRef(onFinished);
  useEffect(() => {
    finished.current = onFinished;
  }, [onFinished]);

  useEffect(() => () => session.current?.cancel(), []);

  const start = useCallback(() => {
    if (!Ctor) return;
    session.current?.cancel();
    const s = new SpeechSession(Ctor, (u) => {
      setState(u);
      if (!u.listening) {
        session.current = null;
        if (u.transcript) finished.current?.(u.transcript);
      }
    });
    session.current = s;
    s.start();
  }, [Ctor]);

  return {
    supported: !!Ctor,
    ...state,
    start,
    done: useCallback(() => session.current?.done(), []),
    cancel: useCallback(() => session.current?.cancel(), []),
  };
}
