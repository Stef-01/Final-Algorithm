import { decisionQuestion, DEMO_TEXT, nextStep, rushedQuestion, runMatching, SessionInput } from './fixtureAgent';
import type { AgentStep, Match, MatchResult, NoMatchAction, Question } from './types';

// Pure session state + transitions. Each transition returns the new state and
// the route to show next, so screens stay thin and this stays unit-testable.

export type SessionState = {
  input: SessionInput;
  /** Questions asked so far, in order (back navigation shows earlier ones). */
  asked: Question[];
  priorities: string[];
  result?: MatchResult;
  /** Current match; equal to matches.length means "end of list". */
  index: number;
  updatedAt: number;
};

export type Transition = { state: SessionState; route: string };

export const initialState = (): SessionState => ({
  input: {
    texts: [],
    answers: {},
    removedPriorities: [],
    prioritiesConfirmed: false,
    includeTelehealth: false,
    safetyAcknowledged: false,
    wantsMoreQuestions: false,
  },
  asked: [],
  priorities: [],
  index: 0,
  updatedAt: Date.now(),
});

const QUESTIONS: Record<string, Question> = {
  [decisionQuestion.id]: decisionQuestion,
  [rushedQuestion.id]: rushedQuestion,
};

export function questionById(state: SessionState, id?: string): Question | undefined {
  return state.asked.find((q) => q.id === id) ?? (id ? QUESTIONS[id] : undefined);
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

/** Patient's opening description (or any free-text turn not tied to a question). */
export function submitText(state: SessionState, text: string): Transition {
  const s = withInput(initialState(), { texts: [text.trim()] });
  return apply(s, nextStep(s.input));
}

export function answer(state: SessionState, questionId: string, value: string): Transition {
  const s = withInput(state, { answers: { ...state.input.answers, [questionId]: value.trim() } });
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
  return {
    ...state,
    result: { status: 'matches', matches: [...matches, ...more], more: [] },
    index: matches.length,
    updatedAt: Date.now(),
  };
}

export function noMatchAction(state: SessionState, action: NoMatchAction): Transition {
  if (action === 'answer_more') {
    const s = withInput(state, { wantsMoreQuestions: true });
    return apply(s, nextStep(s.input));
  }
  // Fixture has no distance model yet; both widen the pool the same way.
  return match(withInput(state, { includeTelehealth: true }));
}

export function currentMatch(state: SessionState): Match | undefined {
  return state.result?.status === 'matches' ? state.result.matches[state.index] : undefined;
}

export function findMatch(state: SessionState, clinicianId: string): Match | undefined {
  return state.result?.status === 'matches'
    ? state.result.matches.find((m) => m.clinicianId === clinicianId)
    : undefined;
}

// ---- Review scenarios for /dev/states (stand-ins for the PRD §51 frames) ----

const run = (texts: string, answers: [string, string][] = []) => {
  let t = submitText(initialState(), texts);
  for (const [q, a] of answers) t = answer(t.state, q, a);
  return t;
};

const demo = () => run(DEMO_TEXT, [[decisionQuestion.id, 'Explain them and decide together']]);

export type Scenario = { id: string; frame: string; label: string; build: () => Transition };

export const scenarios: Scenario[] = [
  { id: 'open', frame: '01_Open', label: 'Open conversation', build: () => ({ state: initialState(), route: '/' }) },
  {
    id: 'followup-choice',
    frame: '03_Followup_Choice',
    label: 'Follow-up (choice)',
    build: () => run(DEMO_TEXT),
  },
  {
    id: 'followup-voice',
    frame: '04_Followup_Voice',
    label: 'Follow-up (own words)',
    build: () => noMatchAction(match(run('I need a new GP.', [[decisionQuestion.id, 'Not sure']]).state).state, 'answer_more'),
  },
  {
    id: 'confirm',
    frame: '05_Preference_Confirm',
    label: 'Preference confirmation',
    build: () => run(DEMO_TEXT, [[decisionQuestion.id, 'Not sure']]),
  },
  {
    id: 'matching',
    frame: '06_Matching',
    label: 'Matching (held)',
    build: () => ({ ...demo(), route: '/matching?hold=1' }),
  },
  { id: 'match-1', frame: '07_Match_1', label: 'Match 1', build: () => match(demo().state) },
  {
    id: 'match-2',
    frame: '08_Match_2',
    label: 'Match 2',
    build: () => ({ state: nextMatch(match(demo().state).state), route: '/matches' }),
  },
  {
    id: 'match-3',
    frame: '09_Match_3',
    label: 'Match 3',
    build: () => ({ state: nextMatch(nextMatch(match(demo().state).state)), route: '/matches' }),
  },
  {
    id: 'end',
    frame: '—',
    label: 'After the last match',
    build: () => ({ state: nextMatch(nextMatch(nextMatch(match(demo().state).state))), route: '/matches' }),
  },
  {
    id: 'detail',
    frame: '10_Clinician_Detail',
    label: 'Clinician detail',
    build: () => ({ state: match(demo().state).state, route: '/clinician/amy-chen' }),
  },
  {
    id: 'no-match',
    frame: '11_No_Strong_Match',
    label: 'No strong match',
    build: () =>
      match(
        run('I need longer appointments on the weekend, in person.', [[decisionQuestion.id, 'Explain them and decide together']])
          .state,
      ),
  },
  {
    id: 'partial',
    frame: '—',
    label: 'Only 2 clinicians fit',
    build: () =>
      match(
        run(`${DEMO_TEXT} I need a GP who bulk bills.`, [[decisionQuestion.id, 'Explain them and decide together']]).state,
      ),
  },
  { id: 'safety', frame: '—', label: 'Safety pause', build: () => run('I have chest pain and need a GP.') },
  {
    id: 'booking',
    frame: '—',
    label: 'Booking handoff',
    build: () => ({ state: match(demo().state).state, route: '/book/amy-chen' }),
  },
];
