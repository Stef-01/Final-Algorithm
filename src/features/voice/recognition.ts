import { Platform } from 'react-native';

// The browser's speech recogniser (Web Speech API). Only the web build has one; the native apps
// fall back to text until a native speech module is added (docs/PLAN.md §7).

type ResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;

export type RecognitionEvent = { resultIndex: number; results: ResultList };

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type RecognitionCtor = new () => RecognitionLike;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (Platform.OS !== 'web') return null;
  const w = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
