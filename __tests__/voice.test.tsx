import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import type { RecognitionEvent, RecognitionLike } from '@/features/voice/recognition';
import { MAX_MS, SILENCE_MS, SpeechSession, STOP_GRACE_MS } from '@/features/voice/speechSession';

// A stand-in for the browser's speech recogniser.
class MockRecognition implements RecognitionLike {
  static last: MockRecognition | null = null;
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((e: RecognitionEvent) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;
  aborted = false;
  private results: { isFinal: boolean; 0: { transcript: string } }[] = [];
  constructor() {
    MockRecognition.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
  abort() {
    this.aborted = true;
  }
  say(text: string, isFinal: boolean) {
    const at = this.results.length && !this.results[this.results.length - 1].isFinal ? this.results.length - 1 : this.results.length;
    this.results[at] = { isFinal, 0: { transcript: text } };
    this.onresult?.({ resultIndex: at, results: this.results });
  }
  end() {
    this.onend?.();
  }
}

let mockSupported = true;
jest.mock('@/features/voice/recognition', () => ({
  getRecognitionCtor: () => (mockSupported ? MockRecognition : null),
}));
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

describe('SpeechSession', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const session = () => {
    const updates: { listening: boolean; transcript: string; error?: string }[] = [];
    const s = new SpeechSession(MockRecognition, (u) => updates.push(u));
    s.start();
    return { s, rec: MockRecognition.last!, updates, last: () => updates[updates.length - 1] };
  };

  it('listens in Australian English with a live transcript', () => {
    const { rec, last } = session();
    expect(rec.lang).toBe('en-AU');
    expect(rec.interimResults).toBe(true);
    rec.say('appointments always', false);
    expect(last()).toEqual({ listening: true, transcript: 'appointments always' });
    rec.say('appointments always feel rushed', true);
    rec.say('and', false);
    expect(last().transcript).toBe('appointments always feel rushed and');
  });

  it('Done keeps the words, including the last ones sent after stopping', () => {
    const { s, rec, last } = session();
    rec.say('I have ADHD', true);
    s.done();
    expect(rec.stopped).toBe(true);
    expect(last().listening).toBe(true);
    rec.say('and anxiety', true);
    rec.end();
    expect(last()).toEqual({ listening: false, transcript: 'I have ADHD and anxiety', error: undefined });
  });

  it('Done still finishes if the browser never ends the session', () => {
    const { s, rec, last } = session();
    rec.say('hello', true);
    s.done();
    jest.advanceTimersByTime(STOP_GRACE_MS);
    expect(last()).toMatchObject({ listening: false, transcript: 'hello' });
  });

  it('Cancel throws the words away', () => {
    const { s, rec, last } = session();
    rec.say('something private', true);
    s.cancel();
    expect(rec.aborted).toBe(true);
    expect(last()).toMatchObject({ listening: false, transcript: '' });
  });

  it('stops by itself after a pause, and at the time limit', () => {
    const a = session();
    a.rec.say('one thing', true);
    jest.advanceTimersByTime(SILENCE_MS + STOP_GRACE_MS);
    expect(a.last()).toMatchObject({ listening: false, transcript: 'one thing' });

    const b = session();
    for (let t = 0; t < MAX_MS; t += SILENCE_MS / 2) {
      b.rec.say('still talking', true);
      jest.advanceTimersByTime(SILENCE_MS / 2);
    }
    jest.advanceTimersByTime(STOP_GRACE_MS);
    expect(b.last().listening).toBe(false);
  });

  it('explains a blocked microphone in plain words', () => {
    const { rec, last } = session();
    rec.onerror?.({ error: 'not-allowed' });
    expect(last()).toMatchObject({ listening: false, transcript: '' });
    expect(last().error).toMatch(/Microphone access was blocked/);
  });
});

describe('voice on the describe screen', () => {
  beforeEach(() => AsyncStorage.clear());
  const routes = () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    return {
      _layout: require('@/app/_layout').default,
      '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
      '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
      '(tabs)/(find)/index': require('@/app/(tabs)/(find)/index').default,
      '(tabs)/(find)/describe': require('@/app/(tabs)/(find)/describe').default,
      '(tabs)/saved': () => null,
      '(tabs)/settings': () => null,
    };
  };

  it('fills the text box with what was said, ready to edit', async () => {
    mockSupported = true;
    renderRouter(routes(), { initialUrl: '/describe' });
    expect(await screen.findByText(/speech service/)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Tap to speak'));
    expect(screen.getByText('Listening…')).toBeOnTheScreen();
    act(() => MockRecognition.last!.say('Appointments always feel rushed', true));
    expect(screen.getByText('Appointments always feel rushed')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Done'));
    act(() => MockRecognition.last!.end());
    expect(screen.getByLabelText("What you're looking for").props.value).toBe('Appointments always feel rushed');
    expect(screen.getByLabelText('Tap to speak')).toBeOnTheScreen();
  });

  it('shows text only where the browser has no speech recognition', async () => {
    mockSupported = false;
    renderRouter(routes(), { initialUrl: '/describe' });
    expect(await screen.findByLabelText("What you're looking for")).toBeOnTheScreen();
    expect(screen.queryByLabelText('Tap to speak')).toBeNull();
    mockSupported = true;
  });
});
