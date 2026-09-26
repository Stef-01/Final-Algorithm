import { pool as clinicianPool, nextStep, normaliseAnswer, priorityLabel, runMatching, signalsFor, type SessionInput } from './agent';
import type { Extraction } from '@server/claude/types';
import { PROFESSIONS } from '@server/engine/types';

import type { AreaId, Filters } from './filters';

import { copyFor } from '@/lib/professions';

import { isUrgent } from './extract';
import { ADVICE_REPLY, CLOSER, describeChange, isAdviceRequest, withoutAdvice, listPhrase, professionSwitch, SUGGESTION_TEXT, understood, type ChatTurn } from './refine';
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
  feedback: { rating?: number; thumbs: Record<string, 'up' | 'down'>; why?: { reasons: string[]; note?: string } };
  /** The refine assistant's conversation (floating button). */
  chat?: ChatTurn[];
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

/**
 * A saved search from storage, if it still has the shape this version needs; otherwise undefined
 * (start fresh rather than crash on an old or corrupted save). Missing optional parts are filled in.
 */
export function restoreState(raw: unknown): SessionState | undefined {
  const s = raw as Partial<SessionState> | null;
  const input = s?.input as Partial<SessionInput> | undefined;
  const ok =
    !!s &&
    typeof s.updatedAt === 'number' &&
    !!input &&
    Array.isArray(input.texts) &&
    input.texts.every((t) => typeof t === 'string') &&
    typeof input.answers === 'object' &&
    input.answers !== null &&
    Array.isArray(s.asked) &&
    Array.isArray(s.priorities) &&
    typeof s.index === 'number' &&
    (s.result === undefined || s.result.status === 'none' || (s.result.status === 'matches' && Array.isArray(s.result.matches) && Array.isArray(s.result.more))) &&
    (s.chat === undefined || Array.isArray(s.chat));
  if (!ok) return undefined;
  return {
    ...(s as SessionState),
    input: { ...emptyInput(), ...input, removedPriorities: input.removedPriorities ?? [] } as SessionInput,
    feedback: { thumbs: {}, ...s.feedback },
  };
}

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
export function chooseProfession(_state: SessionState, profession: ProfessionChoice, draft?: string): Transition {
  return { state: { ...initialState(profession), draft }, route: '/where' };
}

/**
 * Where the patient wants to see someone, asked straight after the profession. Telehealth is fine
 * (no filter), or near a place: in-person options are ranked by distance, telehealth still shows.
 */
export function setWhere(state: SessionState, near: AreaId | null): Transition {
  const { near: _old, distance: _d, ...rest } = state.input.filters ?? {};
  const filters: Filters = near ? { ...rest, near } : rest;
  return { state: { ...state, input: { ...state.input, filters }, updatedAt: Date.now() }, route: '/describe' };
}

/** Load a demo patient: their profession and words, ready to submit on the describe screen. */
export function startDemo(_state: SessionState, demoId: string): Transition {
  const demo = demoById(demoId);
  if (!demo) return { state: initialState(), route: '/' };
  const s = initialState(demo.profession);
  return { state: { ...s, draft: demo.text, input: emptyInput(demo.profession, demo.id) }, route: '/describe' };
}

/** The patient's opening description. Editing a demo's words turns it into an ordinary search. */
export function submitText(state: SessionState, text: string, extracted?: Extraction | null, goals: string[] = []): Transition {
  const t = text.trim();
  const demo = state.input.demoId ? demoById(state.input.demoId) : undefined;
  const demoId = demo && demo.text === t ? demo.id : undefined;
  const s: SessionState = {
    ...initialState(state.profession),
    input: { ...emptyInput(state.profession, demoId), texts: [t], extracted: demoId ? undefined : (extracted ?? undefined), goals: demoId ? [] : goals, filters: state.input.filters },
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

/** Everyone who fits, in order: the featured three, then the rest. The swipe deck runs through all. */
export const deckOf = (state: SessionState): Match[] => (state.result?.status === 'matches' ? [...state.result.matches, ...state.result.more] : []);

export function nextMatch(state: SessionState): SessionState {
  const total = deckOf(state).length;
  return { ...state, index: Math.min(state.index + 1, total), updatedAt: Date.now() };
}

/**
 * Other kinds of professional who suit what the patient said: those whose explained matches (at
 * least one evidence-backed reason) exist for the same needs. Best first, at most three.
 */
export function alsoCouldHelp(state: SessionState): { profession: Profession; count: number }[] {
  const current = state.input.profession;
  if (!current || signalsFor(state.input).clinicalNeeds.length === 0) return [];
  return PROFESSIONS.filter((p) => p !== current)
    .map((p) => {
      const r = runMatching({ ...state.input, profession: p });
      const count = r.status === 'matches' ? [...r.matches, ...r.more].filter((m) => m.reasons.length > 0).length : 0;
      return { profession: p, count };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

/** Search another profession with everything said so far (from "Also could help"). */
export function switchProfession(state: SessionState, profession: Profession): Transition {
  const input = { ...state.input, profession };
  return { state: { ...state, profession, input, result: runMatching(input), index: 0, updatedAt: Date.now() }, route: '/matches' };
}

/** Set filters on the current search and re-rank (from the Filters screen). */
export function setFilters(state: SessionState, filters: Filters): Transition {
  const input = { ...state.input, filters };
  return { state: { ...state, input, result: runMatching(input), index: 0, updatedAt: Date.now() }, route: '/matches' };
}

/** How many would fit with these filters, before applying them ("Show 7"). */
export function countWithFilters(state: SessionState, filters: Filters): number {
  const r = runMatching({ ...state.input, filters });
  return r.status === 'matches' ? r.matches.length + r.more.length : 0;
}

export function prevMatch(state: SessionState): SessionState {
  return { ...state, index: Math.max(0, state.index - 1), updatedAt: Date.now() };
}

export function noMatchAction(state: SessionState, action: NoMatchAction): Transition {
  if (action === 'answer_more') {
    const s = withInput(state, { wantsMoreQuestions: true });
    return apply(s, nextStep(s.input));
  }
  if (action === 'any_profession') {
    const s = withInput({ ...state, profession: 'either' }, { profession: undefined });
    return match(s);
  }
  const change: Partial<SessionInput> =
    action === 'include_telehealth'
      ? { includeTelehealth: true }
      : action === 'expand_distance'
        ? { expandDistance: true }
        : action === 'any_cost'
          ? { anyCost: true }
          : { anyGender: true };
  return match(withInput(state, change));
}

/** Seconds from submitting the description to the shortlist appearing. */
export const secondsToShortlist = (state: SessionState, now = Date.now()) =>
  state.startedAt ? Math.round((now - state.startedAt) / 1000) : 0;

export function rateMatches(state: SessionState, rating: number, why?: { reasons: string[]; note?: string }): SessionState {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  const feedback = { ...state.feedback, rating: r };
  if (why && (why.reasons.length || why.note)) feedback.why = why;
  else delete feedback.why;
  return { ...state, feedback, updatedAt: Date.now() };
}

export function thumb(state: SessionState, clinicianId: string, dir: 'up' | 'down'): SessionState {
  return { ...state, feedback: { ...state.feedback, thumbs: { ...state.feedback.thumbs, [clinicianId]: dir } }, updatedAt: Date.now() };
}

export function findMatch(state: SessionState, clinicianId: string): Match | undefined {
  return deckOf(state).find((m) => m.clinicianId === clinicianId);
}

// ---- Refine assistant ----

const say = (state: SessionState, ...turns: ChatTurn[]): SessionState => ({
  ...state,
  chat: [...(state.chat ?? []), ...turns],
  updatedAt: Date.now(),
});

const firstName = (id: string) => clinicianPool.find((c) => c.id === id)?.firstName ?? 'someone';

/** The assistant's opening line, from where the patient is. */
export function refineGreeting(state: SessionState): string {
  const r = state.result;
  const { many } = copyFor(state.profession);
  if (r?.status === 'matches') {
    const n = r.matches.length + r.more.length;
    return `I've found ${n} ${n === 1 ? copyFor(state.profession).one : many} who fit. Tell me what to change and I'll re-rank them, or pick one of these.`;
  }
  if (r?.status === 'none') return "Nobody fits everything yet. Tell me what you could be flexible on and I'll look again.";
  return "Tell me what you're looking for, in your own words, and I'll find people who fit.";
}

/**
 * One message to the refine assistant. With results showing, it re-ranks in place and says exactly
 * what changed; with nothing yet, the message starts a search like the describe screen.
 */
export function refine(state: SessionState, message: string, extracted?: Extraction | null): Transition {
  const text = message.trim();
  if (!text) return { state, route: '/refine' };
  const words = SUGGESTION_TEXT[text] ?? text;
  const you: ChatTurn = { from: 'you', text };

  const advice = isAdviceRequest(words);
  if (!state.result) {
    // A medical question isn't a description of who they're looking for: answer it honestly, keep waiting.
    if (advice && !isUrgent(words)) return { state: say(state, you, { from: 'agent', text: ADVICE_REPLY }), route: '/refine' };
    const t = submitText({ ...state, input: { ...state.input, demoId: undefined } }, words, extracted);
    const reply: ChatTurn = { from: 'agent', text: 'Thanks. Let me find people who fit that.' };
    return { state: say(t.state, ...(state.chat ?? []), you, reply), route: t.route };
  }

  const switchTo = professionSwitch(words);
  // In a medical question, a condition is the topic ("what drug is best for depression?"), not a
  // request to search for it. Only explicit changes alongside it ("…also online only") count.
  const refinement = advice ? withoutAdvice(words) : words;
  if (advice && !refinement) return { state: say(state, you, { from: 'agent', text: ADVICE_REPLY }), route: '/refine' };
  const input: SessionInput = {
    ...state.input,
    profession: switchTo ?? state.input.profession,
    refinements: [...(state.input.refinements ?? []), refinement],
    // Claude read the whole message, question included, so for a medical question use the keyword
    // reading of what's left instead.
    refinementExtracts: [...(state.input.refinementExtracts ?? state.input.refinements?.map(() => null) ?? []), advice ? null : (extracted ?? null)],
    safetyAcknowledged: state.input.safetyAcknowledged,
  };
  const before = signalsFor(state.input);
  const after = signalsFor(input);

  if (after.safetyFlag?.level === 'urgent') {
    return { state: say({ ...state, input }, you), route: '/safety' };
  }

  const changes = describeChange(before, after, priorityLabel);
  const switched = switchTo && switchTo !== state.input.profession;
  if (advice && changes.length === 0 && !switched) {
    return { state: say(state, you, { from: 'agent', text: ADVICE_REPLY }), route: '/refine' };
  }
  if (changes.length === 0 && !switched && CLOSER.test(words.toLowerCase()) && !after.constraints.origin) {
    const reply: ChatTurn = { from: 'agent', text: 'Closer to where? Tell me a suburb or area, like “near Southport” or “Brisbane CBD”.' };
    return { state: say(state, you, reply), route: '/refine' };
  }
  const claudeRead =
    !advice &&
    !!extracted &&
    (extracted.signals.clinicalNeeds.length > 0 || Object.keys(extracted.signals.preferences).length > 0 || Object.keys(extracted.signals.constraints).length > 0);
  if (changes.length === 0 && !switched && (understood(words, priorityLabel) || switchTo || claudeRead)) {
    const reply: ChatTurn = { from: 'agent', text: "That's already part of what I'm matching on. Anything else you'd like to change?" };
    return { state: say(state, you, reply), route: '/refine' };
  }
  if (changes.length === 0 && !switched) {
    const reply: ChatTurn = {
      from: 'agent',
      text: "I couldn't pick out a change from that. You could say things like “online only”, “someone more direct” or “bulk billed”.",
    };
    return { state: say(state, you, reply), route: '/refine' };
  }

  const result = runMatching(input);
  const what = switched ? `${copyFor(switchTo).many} instead${changes.length ? `, with ${listPhrase(changes)}` : ''}` : listPhrase(changes);
  if (result.status !== 'matches') {
    const reply: ChatTurn = { from: 'agent', text: `No one fits once I add ${what}, so I've kept your current list. Is there something else you could be flexible on?` };
    return { state: say(state, you, reply), route: '/refine' };
  }
  const profession = switched ? switchTo : state.profession;
  const n = result.matches.length + result.more.length;
  const { one, many } = copyFor(profession);
  const first = firstName(result.matches[0].clinicianId);
  const noun = n === 1 ? one : many;
  const reply: ChatTurn = {
    from: 'agent',
    text: `${advice ? "I can't give medical advice; a clinician can help with that part. " : ''}Done: now ${what}. ${n} ${noun} fit, and ${first} is first.`,
    action: 'see_matches',
    facts: advice ? undefined : { said: text, changes, switched: switched ? `${copyFor(switchTo).many} instead` : undefined, count: n, noun, first },
  };
  return { state: say({ ...state, profession, input, result, index: 0 }, you, reply), route: '/refine' };
}

/** Swap the wording of the latest reply (Claude's version of the same facts). */
export function rewordLast(state: SessionState, text: string): SessionState {
  const chat = [...(state.chat ?? [])];
  const last = chat.at(-1);
  if (!last || last.from !== 'agent' || !last.facts) return state;
  chat[chat.length - 1] = { ...last, text, facts: undefined };
  return { ...state, chat, updatedAt: Date.now() };
}

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

/** Run a demo all the way to results, answering "Not sure" (or the given option) to any question. */
export function demoResults(demoId: string, pick: (q: Question) => string = (q) => q.options.find((o) => o === 'Not sure') ?? q.options[0]): SessionState {
  let t = runDemo(demoId);
  for (let i = 0; i < 5 && t.route !== '/matching'; i++) {
    if (t.route.startsWith('/clarify')) {
      const q = t.state.asked[t.state.asked.length - 1];
      t = answer(t.state, q.id, pick(q));
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
    // Both GPs publish a $299 fee, so a GP search that must be bulk billed leaves nobody.
    build: () => {
      const s = demoResults('gp-rushed');
      const input = { ...s.input, refinements: ['bulk billed'], refinementExtracts: [null] };
      return { state: { ...s, input, result: runMatching(input) }, route: '/matches' };
    },
  },
  { id: 'partial', frame: '—', label: 'Only 1 fits', build: () => ({ state: demoResults('gp-female'), route: '/matches' }) },
  { id: 'safety', frame: '—', label: 'Safety pause', build: () => runDemo('either-urgent') },
  { id: 'demos', frame: '—', label: 'Demo patients', build: () => ({ state: initialState(), route: '/demos' }) },
  { id: 'all', frame: '—', label: 'Everyone who fits (ranked)', build: () => ({ state: demoResults(withMatches()), route: '/all' }) },
  { id: 'assistant', frame: '—', label: 'Assistant (opening)', build: () => ({ state: demoResults(withMatches()), route: '/refine' }) },
  {
    id: 'assistant-refined',
    frame: '—',
    label: 'Assistant (after a change)',
    build: () => refine(demoResults(withMatches()), 'Online only'),
  },
  {
    id: 'assistant-advice',
    frame: '—',
    label: 'Assistant (medical question)',
    build: () => refine(demoResults(withMatches()), 'Should I increase my dose?'),
  },
];
