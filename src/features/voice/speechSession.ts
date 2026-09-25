import type { RecognitionCtor, RecognitionEvent, RecognitionLike } from './recognition';

// One listening session (PRD §9): live transcript while speaking, Done keeps it, Cancel discards it.
// Stops by itself after a pause or at a hard cap, so the mic is never left recording (PRD §45).

export const SILENCE_MS = 6000;
export const MAX_MS = 90_000;
/** After Done, how long to wait for the browser's last result before giving up on it. */
export const STOP_GRACE_MS = 1500;

export type SpeechUpdate = { listening: boolean; transcript: string; error?: string };

type Timers = { set: (fn: () => void, ms: number) => unknown; clear: (id: unknown) => void };

const defaultTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. You can allow it in your browser settings, or type instead.',
  'service-not-allowed': 'Speech recognition is turned off in this browser. You can type instead.',
  'no-speech': "I didn't catch anything. Try again, or type instead.",
  'audio-capture': "I couldn't find a microphone. You can type instead.",
  network: 'Speech recognition needs a connection right now. You can type instead.',
};

export class SpeechSession {
  private rec: RecognitionLike | null = null;
  private finalText = '';
  private interim = '';
  private silence: unknown = null;
  private cap: unknown = null;
  private grace: unknown = null;
  private cancelled = false;

  constructor(
    private readonly Ctor: RecognitionCtor,
    private readonly onUpdate: (u: SpeechUpdate) => void,
    private readonly timers: Timers = defaultTimers,
  ) {}

  get transcript() {
    return `${this.finalText}${this.interim}`.replace(/\s+/g, ' ').trim();
  }

  start(lang = 'en-AU') {
    const rec = new this.Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => this.handleResult(e);
    rec.onerror = (e) => this.finish(ERRORS[e.error] ?? 'Something went wrong with voice. You can type instead.');
    rec.onend = () => this.finish();
    this.rec = rec;
    this.finalText = '';
    this.interim = '';
    this.cancelled = false;
    rec.start();
    this.cap = this.timers.set(() => this.done(), MAX_MS);
    this.armSilence();
    this.onUpdate({ listening: true, transcript: '' });
  }

  /** Done: stop listening and keep what was said. The browser sends its last words, then ends. */
  done() {
    if (!this.rec || this.grace) return;
    this.rec.stop();
    this.grace = this.timers.set(() => this.finish(), STOP_GRACE_MS);
  }

  /** Cancel: stop listening and throw away what was said. */
  cancel() {
    this.cancelled = true;
    this.finalText = '';
    this.interim = '';
    this.rec?.abort();
    this.finish();
  }

  private handleResult(e: RecognitionEvent) {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) this.finalText += `${r[0].transcript} `;
      else interim += r[0].transcript;
    }
    this.interim = interim;
    this.armSilence();
    this.onUpdate({ listening: true, transcript: this.transcript });
  }

  private armSilence() {
    if (this.silence) this.timers.clear(this.silence);
    this.silence = this.timers.set(() => this.done(), SILENCE_MS);
  }

  private finish(error?: string) {
    if (!this.rec) return;
    for (const t of [this.silence, this.cap, this.grace]) if (t) this.timers.clear(t);
    this.silence = this.cap = this.grace = null;
    const rec = this.rec;
    this.rec = null;
    rec.onresult = rec.onerror = rec.onend = null;
    // Keep any final words even if the browser reports an error at the end.
    const transcript = this.cancelled ? '' : `${this.finalText}${this.interim}`.replace(/\s+/g, ' ').trim();
    this.onUpdate({ listening: false, transcript, error: error && !transcript ? error : undefined });
  }
}
