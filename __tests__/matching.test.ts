import fs from 'fs';
import path from 'path';

import { professionals } from '@server/data/professionals';
import { areaPhrase, copyProblems } from '@server/engine/explain';
import { CONFIDENCE, DIMENSIONS, type Dimension } from '@server/engine/types';

import { costLabel } from '@/components/ClinicianCards';
import { getClinician } from '@/data/clinicians';
import { signalsFor } from '@/features/match/agent';
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
  it('imports the GPs and psychologists, nothing else', () => {
    expect(professionals.length).toBe(source.length);
    expect(new Set(professionals.map((c) => c.profession))).toEqual(new Set(['gp', 'psychologist']));
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
  it('has run-throughs for GPs, psychologists and unsure patients', () => {
    expect(new Set(demos.map((d) => d.profession))).toEqual(new Set(['gp', 'psychologist', 'either']));
    expect(new Set(demos.map((d) => d.id)).size).toBe(demos.length);
  });

  it.each(demos.map((d) => [d.id]))('%s reaches a result within the question ceiling', (id) => {
    const t = core.runDemo(id);
    expect(['/matching', '/confirm', '/safety'].includes(t.route) || t.route.startsWith('/clarify')).toBe(true);
    const state = core.demoResults(id);
    expect(state.asked.length).toBeLessThanOrEqual(4);
    expect(state.result).toBeDefined();
    for (const m of matchesOf(state.result)) {
      expect(m.reasons.length).toBeGreaterThan(0);
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

  it('bulk-billed psychologist: an honest no-match', () => {
    expect(core.demoResults('psych-bulk-billed').result?.status).toBe('none');
  });

  it('urgent symptom: pauses for safety first', () => {
    expect(core.runDemo('either-urgent').route).toBe('/safety');
  });
});
