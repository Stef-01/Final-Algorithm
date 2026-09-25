import fs from 'fs';
import path from 'path';

import { professionals } from '@server/data/professionals';
import { areaPhrase, copyProblems, needLine, reasonsFor, saidLine } from '@server/engine/explain';
import { CONFIDENCE, DIMENSIONS, PROFESSIONS, type Dimension } from '@server/engine/types';

import { costLabel } from '@/components/ClinicianCards';
import { matchesHeadline, matchesSubline } from '@/lib/professions';
import { getClinician } from '@/data/clinicians';
import { signalsFor } from '@/features/match/agent';
import { QUESTIONS } from '@server/questions';
import { demos } from '@/features/match/demos';
import { extractSignals } from '@/features/match/extract';
import * as core from '@/features/match/sessionCore';
import type { Match, MatchResult } from '@/features/match/types';

const matchesOf = (r?: MatchResult): Match[] => (r?.status === 'matches' ? r.matches : []);
const source: { id: string; description: string; chips: string[]; experience: string[]; about: string[]; details: [string, string][] }[] =
  JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/adhdme/source.json'), 'utf8'));
const corpus = (id: string) => {
  const c = source.find((x) => x.id === id)!;
  return [c.description, ...c.chips, ...c.experience, ...c.about, ...c.details.map(([, v]) => v)].join('\n');
};

describe('ADHDme profiles (server/data/professionals.json)', () => {
  it('imports every profession the network has, each a known one', () => {
    expect(professionals.length).toBe(source.length);
    expect(new Set(professionals.map((c) => c.profession))).toEqual(new Set(PROFESSIONS));
    expect(professionals.filter((c) => c.profession === 'gp').length).toBeGreaterThan(0);
    expect(professionals.filter((c) => c.profession === 'psychologist').length).toBeGreaterThan(0);
  });

  it.each(professionals.map((c) => [c.id, c]))('%s: every trait is quoted from the published profile', (id, c) => {
    const text = corpus(id as string);
    for (const e of c.evidence) {
      expect(text).toContain(e.excerpt);
      expect(e.reviewerStatus).toBe('profile');
      expect(CONFIDENCE[e.confidence]).toBeLessThanOrEqual(CONFIDENCE.medium);
      expect(copyProblems(e.patientFacing)).toEqual([]);
    }
    for (const [d, t] of Object.entries(c.phenotype)) {
      expect(DIMENSIONS[d as Dimension] as readonly string[]).toContain(t!.value);
    }
  });

  it("never invents a fee or availability that a profile doesn't publish", () => {
    for (const c of professionals) {
      expect(c.practical.daysUntilAvailable).toBeNull();
      expect(c.practical.weekends).toBeNull();
      if (c.practice === 'GOALS Psychology' || c.practice === 'Atlantis Recovery Centre') {
        expect(c.practical.fee).toBeNull();
        expect(costLabel(getClinician(c.id)!)).toBe('Fee on request');
      }
    }
    expect(costLabel(getClinician('paula-garrido')!)).toBe('$104 after rebate');
    expect(costLabel(getClinician('anu-saxena')!)).toBe('$299, no rebate');
    expect(costLabel(getClinician('jessica-katsamatsas')!)).toBe('$220 a session');
  });

  it("shows each practice's billing in its own published words", () => {
    for (const c of professionals) {
      const published = source.find((x) => x.id === c.id)!.details.find(([k]) => k === 'Billing')?.[1].trim().replace(/;$/, '');
      if (!published) continue;
      expect(c.practical.billingNote!.toLowerCase().startsWith(published.toLowerCase())).toBe(true);
    }
  });

  it('records a session length only where the profile states one', () => {
    for (const c of professionals) {
      const said = corpus(c.id).match(/(\d+)-min/);
      expect(c.practical.initialConsultMins).toBe(said ? Number(said[1]) : null);
      expect(c.practical.newPatients).toBeNull();
    }
  });

  it('lists qualifications as separate items, each traceable to the profile', () => {
    const quals = source as unknown as { id: string; qualifications?: string }[];
    for (const c of professionals) {
      const text = corpus(c.id);
      const postnominals = quals.find((x) => x.id === c.id)?.qualifications ?? '';
      for (const q of c.qualifications ?? []) {
        // Either in the profile word for word, or a decoded post-nominal that the profile shows.
        const decoded = !!q.detail && postnominals.includes(q.detail) && !text.includes(q.title);
        expect({ id: c.id, q: q.title, ok: text.includes(q.title) || decoded }).toEqual({ id: c.id, q: q.title, ok: true });
        expect(q.title).not.toMatch(/,\s*(in progress|completed)$/i);
      }
    }
    expect(professionals.find((c) => c.id === 'alice-bui')!.qualifications).toContainEqual({ title: 'Master of Clinical Psychology', badge: 'In progress', kind: 'degree' });
  });

  it('has a portrait for every professional', () => {
    for (const c of professionals) {
      expect(fs.existsSync(path.join(__dirname, '../assets/clinicians', c.photo))).toBe(true);
      expect(getClinician(c.id)!.photo).toBeTruthy();
    }
  });
});

describe('keyword extractor (stand-in for the Claude extractor)', () => {
  it('picks up needs, preferences and constraints from plain text', () => {
    const s = extractSignals("I'm 24, I have ADHD and anxiety, appointments feel rushed and I want it bulk billed, online only.");
    expect(s.clinicalNeeds.map((n) => n.area)).toEqual(expect.arrayContaining(['ADHD', 'Anxiety', 'Neurodivergent adults']));
    expect(s.preferences.consultation_pace).toEqual({ value: 'unhurried', confidence: 'medium' });
    expect(s.constraints).toMatchObject({ age: 24, maxGap: 0, mode: 'telehealth_only' });
  });

  it('only sets a clinician gender when explicitly asked for', () => {
    expect(extractSignals('I would like a female GP').constraints.clinicianGender).toBe('female');
    expect(extractSignals('I am a woman with ADHD').constraints.clinicianGender).toBeUndefined();
  });

  it('flags urgent wording for the safety pause', () => {
    expect(extractSignals('I have chest pain').safetyFlag?.level).toBe('urgent');
    expect(extractSignals('I have ADHD').safetyFlag).toBeUndefined();
  });

  it('keeps acronyms when writing an area into a sentence', () => {
    expect(areaPhrase('Career and performance')).toBe('career and performance');
    expect(areaPhrase('ADHD')).toBe('ADHD');
    expect(areaPhrase("Women's health")).toBe("women's health");
  });
});

describe('funnel and session', () => {
  it('starts with the profession, then the description', () => {
    const t = core.chooseProfession(core.initialState(), 'psychologist');
    expect(t.route).toBe('/describe');
    expect(t.state.profession).toBe('psychologist');
    expect(t.state.input.profession).toBe('psychologist');
    expect(core.chooseProfession(core.initialState(), 'either').state.input.profession).toBeUndefined();
  });

  it('only matches the chosen profession', () => {
    for (const p of ['gp', 'psychologist'] as const) {
      const state = core.demoResults(demos.find((d) => d.profession === p)!.id);
      for (const m of matchesOf(state.result)) expect(getClinician(m.clinicianId)!.profession).toBe(p);
    }
  });

  it('prefills a demo, and editing its words turns it into an ordinary search', () => {
    const demo = demos.find((d) => d.id === 'psych-gold-coast')!;
    const loaded = core.startDemo(core.initialState(), demo.id);
    expect(loaded.state.draft).toBe(demo.text);
    expect(core.submitText(loaded.state, demo.text).state.input.demoId).toBe(demo.id);
    expect(core.submitText(loaded.state, `${demo.text} Also sleep.`).state.input.demoId).toBeUndefined();
  });

  it('treats an answer in the patient’s own words as extra description', () => {
    const t = core.runDemo('psych-masking');
    const q = t.state.asked.at(-1)!;
    const next = core.answer(t.state, q.id, "I'd rather we talk things through together");
    expect(next.state.input.answers[q.id]).toBe('Not sure');
    expect(next.state.input.texts.at(-1)).toBe("I'd rather we talk things through together");
    expect(signalsFor(next.state.input).preferences.shared_decision_making?.value).toBe('shared');
  });
});

describe('demo run-throughs', () => {
  it('has run-throughs for each main profession and unsure patients', () => {
    expect(new Set(demos.map((d) => d.profession))).toEqual(new Set(['gp', 'psychologist', 'adhd_coach', 'physiotherapist', 'occupational_therapist', 'either']));
    expect(new Set(demos.map((d) => d.id)).size).toBe(demos.length);
  });

  it.each(demos.map((d) => [d.id]))('%s reaches a result within the question ceiling', (id) => {
    const t = core.runDemo(id);
    expect(['/matching', '/confirm', '/safety'].includes(t.route) || t.route.startsWith('/clarify')).toBe(true);
    const state = core.demoResults(id);
    expect(state.asked.length).toBeLessThanOrEqual(4);
    expect(state.result).toBeDefined();
    for (const m of matchesOf(state.result)) {
      if (m.fit !== 'Possible fit') expect(m.reasons.length).toBeGreaterThan(0);
      expect(m.reasons.length).toBeLessThanOrEqual(3);
      for (const r of m.reasons) expect(copyProblems(`${r.signal} ${r.evidence}`)).toEqual([]);
    }
  });

  it('trauma, online only: telehealth psychologists with trauma experience, explained', () => {
    const [first, second] = matchesOf(core.demoResults('psych-trauma-online').result);
    expect([first.clinicianId, second.clinicianId]).toEqual(['alice-bui', 'paula-garrido']);
    expect(first.fit).toBe('Strong fit');
    expect(first.reasons[0].signal).toBe("You're looking for help with trauma.");
    for (const m of matchesOf(core.demoResults('psych-trauma-online').result)) {
      expect(getClinician(m.clinicianId)!.practical.modes).toContain('Telehealth');
    }
  });

  it('female GP: narrows to the one GP who matches, without padding', () => {
    expect(matchesOf(core.demoResults('gp-female').result).map((m) => m.clinicianId)).toEqual(['anu-saxena']);
  });

  it('Gold Coast, straight talk: Bart first, for being straight-talking', () => {
    const [bart] = matchesOf(core.demoResults('psych-gold-coast').result);
    expect(bart.clinicianId).toBe('bart-traynor');
    expect(bart.reasons.map((r) => r.evidence)).toContain('Bart describes himself as straight-talking.');
  });

  it('bulk-billed psychologist: still lists psychologists, flagging that the cost can’t be confirmed', () => {
    const r = core.demoResults('psych-bulk-billed').result;
    if (r?.status !== 'matches') throw new Error('expected matches');
    const all = [...r.matches, ...r.more];
    expect(all.length).toBeGreaterThan(3);
    for (const m of all) expect(m.caveats).toContain('fee_unpublished');
    // Nobody with a known fee above the limit appears.
    expect(all.some((m) => m.clinicianId === 'paula-garrido')).toBe(false);
  });

  it('lists everyone who fits, ranked, not just three', () => {
    const r = core.demoResults('psych-trauma-online').result;
    if (r?.status !== 'matches') throw new Error('expected matches');
    expect(r.matches).toHaveLength(3);
    expect(r.more.length).toBeGreaterThan(0);
    const telehealth = professionals.filter((c) => c.profession === 'psychologist' && c.practical.modes.includes('telehealth'));
    expect(r.matches.length + r.more.length).toBe(telehealth.length);
  });

  it('urgent symptom: pauses for safety first', () => {
    expect(core.runDemo('either-urgent').route).toBe('/safety');
  });
});

describe('results headline', () => {
  it("doesn't claim to recommend when nothing the patient said picks anyone out", () => {
    expect(matchesHeadline(2, 'gp', 0)).toBe('These GPs meet what you asked for.');
    expect(matchesSubline(2, 0)).toBe('Nothing picks one out yet.');
    expect(matchesHeadline(3, 'psychologist', 2)).toBe("I found 3 psychologists I'd start with.");
    expect(matchesSubline(3, 1)).toBeNull();
    expect(matchesSubline(3, 3)).toBe('Each fits for slightly different reasons.');
  });

  it('a vague search gets the honest headline', () => {
    const t = core.submitText(core.initialState('gp'), 'I need a GP');
    const r = core.match(t.state).state.result;
    if (r?.status !== 'matches') throw new Error('expected matches');
    const explained = r.matches.filter((m) => m.reasons.length > 0).length;
    expect(matchesHeadline(r.matches.length, 'gp', explained)).toMatch(/meet what you asked for/);
  });
});

describe('why-they-fit wording', () => {
  it('names kinds of help and groups of people naturally', () => {
    expect(needLine('ADHD assessment')).toBe("You're looking for an ADHD assessment.");
    expect(needLine('Children')).toBe("You're looking for help for a child.");
    expect(needLine('NDIS support')).toBe("You're looking for support with the NDIS.");
    expect(needLine('Trauma')).toBe("You're looking for help with trauma.");
  });

  it("quotes the patient's own words, and keeps scripted second-person quotes plain", () => {
    expect(saidLine("I've been masking for years")).toBe("You said “I've been masking for years.”");
    expect(saidLine("you've been masking for years.")).toBe("You said you've been masking for years.");
    expect(saidLine('my sleep is a mess!')).toBe('You said “My sleep is a mess.”');
  });

  it('every need line, for every area a clinician lists, passes the copy rules', () => {
    for (const area of new Set(professionals.flatMap((c) => c.expertise.map((e) => e.area)))) {
      expect(copyProblems(needLine(area))).toEqual([]);
      expect(needLine(area)).not.toMatch(/help with (children|young|neurodivergent|refugee|ndis support|parenting support)/i);
    }
  });
});

describe('one reason for several needs', () => {
  it('names every need the same evidence covers', () => {
    const jess = professionals.find((c) => c.id === 'jessica-katsamatsas')!;
    const r = reasonsFor(jess, {
      clinicalNeeds: [
        { area: 'Anxiety', confidence: 'high' },
        { area: 'Burnout', confidence: 'high' },
        { area: 'Self-esteem', confidence: 'high' },
      ],
      preferences: {},
      constraints: {},
    });
    expect(r).toHaveLength(1);
    expect(r[0].signal).toBe("You're looking for help with anxiety, burnout and self-esteem.");
    expect(r[0].evidence).toBe('Jess works with anxiety, burnout, self-esteem and relationship difficulties.');
  });

  it('only names the needs that evidence actually covers', () => {
    const paula = professionals.find((c) => c.id === 'paula-garrido')!;
    const r = reasonsFor(paula, { clinicalNeeds: [{ area: 'ADHD', confidence: 'high' }, { area: 'Trauma', confidence: 'medium' }], preferences: {}, constraints: {} });
    expect(r[0].signal).toBe("You're looking for help with ADHD.");
  });
});

describe('question wording follows the profession', () => {
  it('no question assumes a doctor, and continuity is only asked about GPs', () => {
    for (const q of QUESTIONS) expect(q.text).not.toMatch(/\ba doctor\b/);
    expect(QUESTIONS.find((q) => q.id === 'continuity')!.professions).toEqual(['gp']);
  });

  it('never asks a psychologist seeker about their GP', () => {
    for (const d of demos.filter((x) => x.profession === 'psychologist')) {
      const s = core.demoResults(d.id);
      for (const q of s.asked) expect(q.text).not.toMatch(/\bGP\b|doctor/);
    }
  });
});

describe('more kinds of professional', () => {
  const search = (profession: (typeof PROFESSIONS)[number], text: string) => {
    let t = core.submitText(core.chooseProfession(core.initialState(), profession).state, text);
    for (let i = 0; i < 5 && t.route !== '/matching'; i++) {
      if (t.route.startsWith('/clarify')) {
        const q = t.state.asked.at(-1)!;
        t = core.answer(t.state, q.id, 'Not sure');
      } else if (t.route === '/confirm') t = core.confirmPriorities(t.state, []);
      else break;
    }
    return core.match(t.state).state.result;
  };

  it.each(PROFESSIONS.map((p) => [p]))('a %s search lists only that profession', (p) => {
    const r = search(p, 'I have ADHD');
    if (r?.status !== 'matches') throw new Error(`expected ${p} matches`);
    for (const m of [...r.matches, ...r.more]) expect(getClinician(m.clinicianId)!.profession).toBe(p);
  });

  it('an ADHD coach search for getting organised explains itself with executive functioning', () => {
    const r = search('adhd_coach', "I procrastinate and can't get organised");
    if (r?.status !== 'matches') throw new Error('expected matches');
    expect(r.matches[0].reasons[0].signal).toBe("You're looking for help with executive functioning.");
  });

  it('physiotherapists for chronic pain', () => {
    const r = search('physiotherapist', 'I have chronic pain in my back');
    if (r?.status !== 'matches') throw new Error('expected matches');
    expect(r.matches[0].clinicianId).toBe('lester-rafanan');
  });

  it('a paediatric OT is not offered to an adult', () => {
    const r = search('occupational_therapist', "I'm 40 and struggle with sensory overload");
    expect(r?.status).toBe('none');
  });
});

describe('also could help', () => {
  it('suggests other professions that suit what was said, and switches keeping the words', () => {
    const s = core.demoResults('psych-masking');
    const others = core.alsoCouldHelp(s);
    expect(others.length).toBeGreaterThan(0);
    expect(others.map((o) => o.profession)).not.toContain('psychologist');
    expect(others[0].profession).toBe('adhd_coach');
    const t = core.switchProfession(s, 'adhd_coach');
    expect(t.route).toBe('/matches');
    expect(t.state.profession).toBe('adhd_coach');
    expect(t.state.input.texts).toEqual(s.input.texts);
    const r = t.state.result;
    if (r?.status !== 'matches') throw new Error('expected matches');
    for (const m of [...r.matches, ...r.more]) expect(getClinician(m.clinicianId)!.profession).toBe('adhd_coach');
  });

  it('says nothing when nothing specific was asked for', () => {
    const t = core.submitText(core.chooseProfession(core.initialState(), 'gp').state, 'I need a GP');
    expect(core.alsoCouldHelp(core.match(t.state).state)).toEqual([]);
  });
});
