import { bankQuestion, nextStep, normaliseAnswer, runMatching, type SessionInput } from './agent';
import { demoById, demos } from './demos';
import type { AgentStep, Match, MatchResult, NoMatchAction, Priority, Profession, Question } from './types';

// Pure session state + transitions. Each transition returns the new state and the route to show
// next, so screens stay thin and this stays unit-testable.

export type ProfessionChoice = Profession | 'either';

export type SessionState = {
  /** Set by the funnel on the first screen. */
  profession?: ProfessionChoice;
  /** Text to prefill on the describe screen (e.g. a demo patient's words). */
  draft?: string;
  input: SessionInput;
  /** Questions asked so far, in order (back navigation shows earlier ones). */
  asked: Question[];
  priorities: Priority[];
  result?: MatchResult;
  /** Current match; equal to matches.length means "end of list". */
  index: number;
  /** When the patient submitted their description (time-to-shortlist, PRD §49). */
  startedAt?: number;
  /** In-app validation (PRD §49): a 1–5 credibility rating and per-match thumbs. */
  feedback: { rating?: number; thumbs: Record<string, 'up' | 'down'> };
  updatedAt: number;
};

export type Transition = { state: SessionState; route: string };

const emptyInput = (profession?: ProfessionChoice, demoId?: string): SessionInput => ({
  profession: profession === 'either' ? undefined : profession,
  demoId,
  texts: [],
  answers: {},
  removedPriorities: [],
  prioritiesConfirmed: false,
  includeTelehealth: false,
  expandDistance: false,
  safetyAcknowledged: false,
  wantsMoreQuestions: false,
});

export const initialState = (profession?: ProfessionChoice): SessionState => ({
  profession,
  input: emptyInput(profession),
  asked: [],
  priorities: [],
  index: 0,
  feedback: { thumbs: {} },
  updatedAt: Date.now(),
});

export function questionById(state: SessionState, id?: string): Question | undefined {
  return state.asked.find((q) => q.id === id);
}

function withInput(state: SessionState, input: Partial<SessionInput>): SessionState {
  return { ...state, input: { ...state.input, ...input }, updatedAt: Date.now() };
}

function apply(state: SessionState, step: AgentStep): Transition {
  switch (step.type) {
    case 'ask': {
      const asked = state.asked.some((q) => q.id === step.question.id) ? state.asked : [...state.asked, step.question];
      return { state: { ...state, asked }, route: `/clarify?q=${step.question.id}` };
    }
    case 'confirm':
      return { state: { ...state, priorities: step.priorities }, route: '/confirm' };
    case 'safety':
      return { state, route: '/safety' };
    case 'match':
      return { state, route: '/matching' };
  }
}

/** The funnel: which kind of professional (PRD screen 01 is next). */
export function chooseProfession(_state: SessionState, profession: ProfessionChoice): Transition {
  return { state: initialState(profession), route: '/describe' };
}

/** Load a demo patient: their profession and words, ready to submit on the describe screen. */
export function startDemo(_state: SessionState, demoId: string): Transition {
  const demo = demoById(demoId);
  if (!demo) return { state: initialState(), route: '/' };
  const s = initialState(demo.profession);
  return { state: { ...s, draft: demo.text, input: emptyInput(demo.profession, demo.id) }, route: '/describe' };
}

/** The patient's opening description. Editing a demo's words turns it into an ordinary search. */
export function submitText(state: SessionState, text: string): Transition {
  const t = text.trim();
  const demo = state.input.demoId ? demoById(state.input.demoId) : undefined;
  const demoId = demo && demo.text === t ? demo.id : undefined;
  const s: SessionState = {
    ...initialState(state.profession),
    input: { ...emptyInput(state.profession, demoId), texts: [t] },
    startedAt: Date.now(),
  };
  return apply(s, nextStep(s.input));
}

export function answer(state: SessionState, questionId: string, value: string): Transition {
  const { label, ownWords } = normaliseAnswer(questionId, value);
  const s = withInput(state, {
    answers: { ...state.input.answers, [questionId]: label },
    texts: ownWords ? [...state.input.texts, ownWords] : state.input.texts,
    wantsMoreQuestions: false,
  });
  return apply(s, nextStep(s.input));
}

export function confirmPriorities(state: SessionState, removed: string[]): Transition {
  const s = withInput(state, { removedPriorities: removed, prioritiesConfirmed: true });
  return apply(s, nextStep(s.input));
}

export function acknowledgeSafety(state: SessionState): Transition {
  const s = withInput(state, { safetyAcknowledged: true });
  return apply(s, nextStep(s.input));
}

export function match(state: SessionState): Transition {
  return { state: { ...state, result: runMatching(state.input), index: 0, updatedAt: Date.now() }, route: '/matches' };
}

export function nextMatch(state: SessionState): SessionState {
  const total = state.result?.status === 'matches' ? state.result.matches.length : 0;
  return { ...state, index: Math.min(state.index + 1, total), updatedAt: Date.now() };
}

/** "See more options" — only on explicit request (PRD §4.7). */
export function showMore(state: SessionState): SessionState {
  if (state.result?.status !== 'matches' || state.result.more.length === 0) return state;
  const { matches, more } = state.result;
  return { ...state, result: { status: 'matches', matches: [...matches, ...more], more: [] }, index: matches.length, updatedAt: Date.now() };
}

export function noMatchAction(state: SessionState, action: NoMatchAction): Transition {
  if (action === 'answer_more') {
    const s = withInput(state, { wantsMoreQuestions: true });
    return apply(s, nextStep(s.input));
  }
  const s = withInput(state, action === 'include_telehealth' ? { includeTelehealth: true } : { expandDistance: true });
  return match(s);
}

/** Seconds from submitting the description to the shortlist appearing. */
export const secondsToShortlist = (state: SessionState, now = Date.now()) =>
  state.startedAt ? Math.round((now - state.startedAt) / 1000) : 0;

export function rateMatches(state: SessionState, rating: number): SessionState {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  return { ...state, feedback: { ...state.feedback, rating: r }, updatedAt: Date.now() };
}

export function thumb(state: SessionState, clinicianId: string, dir: 'up' | 'down'): SessionState {
  return { ...state, feedback: { ...state.feedback, thumbs: { ...state.feedback.thumbs, [clinicianId]: dir } }, updatedAt: Date.now() };
}

export function currentMatch(state: SessionState): Match | undefined {
  return state.result?.status === 'matches' ? state.result.matches[state.index] : undefined;
}

export function findMatch(state: SessionState, clinicianId: string): Match | undefined {
  return state.result?.status === 'matches' ? state.result.matches.find((m) => m.clinicianId === clinicianId) : undefined;
}

export const isKnownQuestion = (id?: string) => !!bankQuestion(id);

// ---- Review scenarios for /dev/states (stand-ins for the PRD §51 frames) ----

/** Run a demo to its first stop: submit its words, then answer questions with the given labels. */
export function runDemo(demoId: string, answers: string[] = []): Transition {
  let t = submitText(startDemo(initialState(), demoId).state, demoById(demoId)!.text);
  for (const a of answers) {
    const q = t.state.asked[t.state.asked.length - 1];
    if (!t.route.startsWith('/clarify') || !q) break;
    t = answer(t.state, q.id, a);
  }
  return t;
}

/** Run a demo all the way to results, answering any question with its first option. */
export function demoResults(demoId: string): SessionState {
  let t = runDemo(demoId);
  for (let i = 0; i < 5 && t.route !== '/matching'; i++) {
    if (t.route.startsWith('/clarify')) {
      const q = t.state.asked[t.state.asked.length - 1];
      t = answer(t.state, q.id, q.options[0]);
    } else if (t.route === '/confirm') {
      t = confirmPriorities(t.state, []);
    } else if (t.route === '/safety') {
      t = acknowledgeSafety(t.state);
    } else break;
  }
  return match(t.state).state;
}

const firstDemoWhere = (pred: (t: Transition) => boolean) => demos.find((d) => pred(runDemo(d.id)))?.id;

export type Scenario = { id: string; frame: string; label: string; build: () => Transition };

const withMatches = () =>
  demos.map((d) => d.id).find((id) => {
    const r = demoResults(id).result;
    return r?.status === 'matches' && r.matches.length === 3;
  }) ?? demos[0].id;

export const scenarios: Scenario[] = [
  { id: 'funnel', frame: '00_Funnel', label: 'Who are you looking for?', build: () => ({ state: initialState(), route: '/' }) },
  {
    id: 'open',
    frame: '01_Open',
    label: 'Open conversation',
    build: () => chooseProfession(initialState(), 'psychologist'),
  },
  {
    id: 'followup-choice',
    frame: '03_Followup_Choice',
    label: 'Follow-up (choice)',
    build: () => runDemo(firstDemoWhere((t) => t.route.startsWith('/clarify')) ?? 'either-unsure'),
  },
  {
    id: 'followup-voice',
    frame: '04_Followup_Voice',
    label: 'Follow-up (own words)',
    build: () => {
      const t = runDemo(firstDemoWhere((t) => t.route.startsWith('/clarify')) ?? 'either-unsure');
      return { ...t, route: `${t.route}&own=1` };
    },
  },
  {
    id: 'confirm',
    frame: '05_Preference_Confirm',
    label: 'Preference confirmation',
    build: () => {
      for (const d of demos) {
        let t = runDemo(d.id);
        for (let i = 0; i < 4 && t.route.startsWith('/clarify'); i++) {
          const q = t.state.asked[t.state.asked.length - 1];
          t = answer(t.state, q.id, q.options[0]);
        }
        if (t.route === '/confirm') return t;
      }
      return { state: initialState(), route: '/' };
    },
  },
  {
    id: 'matching',
    frame: '06_Matching',
    label: 'Matching (held)',
    build: () => ({ state: runDemo(withMatches()).state, route: '/matching?hold=1' }),
  },
  { id: 'match-1', frame: '07_Match_1', label: 'Match 1', build: () => ({ state: demoResults(withMatches()), route: '/matches' }) },
  {
    id: 'match-2',
    frame: '08_Match_2',
    label: 'Match 2',
    build: () => ({ state: nextMatch(demoResults(withMatches())), route: '/matches' }),
  },
  {
    id: 'match-3',
    frame: '09_Match_3',
    label: 'Match 3',
    build: () => ({ state: nextMatch(nextMatch(demoResults(withMatches()))), route: '/matches' }),
  },
  {
    id: 'end',
    frame: '—',
    label: 'After the last match',
    build: () => ({ state: nextMatch(nextMatch(nextMatch(demoResults(withMatches())))), route: '/matches' }),
  },
  {
    id: 'detail',
    frame: '10_Clinician_Detail',
    label: 'Clinician detail',
    build: () => {
      const state = demoResults(withMatches());
      const first = state.result?.status === 'matches' ? state.result.matches[0].clinicianId : '';
      return { state, route: `/clinician/${first}` };
    },
  },
  {
    id: 'no-match',
    frame: '11_No_Strong_Match',
    label: 'No strong match',
    build: () => ({ state: demoResults('psych-bulk-billed'), route: '/matches' }),
  },
  { id: 'partial', frame: '—', label: 'Only 1 fits', build: () => ({ state: demoResults('gp-female'), route: '/matches' }) },
  { id: 'safety', frame: '—', label: 'Safety pause', build: () => runDemo('either-urgent') },
  { id: 'demos', frame: '—', label: 'Demo patients', build: () => ({ state: initialState(), route: '/demos' }) },
];
