/**
 * @jest-environment node
 */
// The Claude extractor path (Phase 8), with the SDK mocked: no network, no API spend.
import { AREAS, SCHEMA, SYSTEM, toExtraction } from '../server/claude/extract';

import { signalsFor } from '@/features/match/agent';
import { demos } from '@/features/match/demos';
import * as core from '@/features/match/sessionCore';

const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status = 500;
  }
  class RateLimitError extends APIError {}
  const Anthropic = jest.fn().mockImplementation(() => ({ beta: { messages: { create: mockCreate } } }));
  Object.assign(Anthropic, { APIError, RateLimitError });
  return { __esModule: true, default: Anthropic };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require('../api/extract') as typeof import('../api/extract');

const blank = {
  needs: [],
  preferences: [],
  mode: 'unset',
  cost: 'unset',
  max_gap_dollars: 0,
  weekend: 'unset',
  clinician_gender: 'unset',
  distance: 'unset',
  age: 0,
  urgent: false,
  urgent_reason: '',
};
const reply = (raw: object, stop_reason = 'end_turn') => ({ stop_reason, content: [{ type: 'text', text: JSON.stringify(raw) }] });
const post = (body: unknown) => api.POST(new Request('http://x/api/extract', { method: 'POST', headers: { origin: 'http://x' }, body: JSON.stringify(body) }));

describe('validating what Claude returns', () => {
  const text = "I'm 31 with ADHD, appointments feel rushed and I want someone blunt. Online only.";

  it('keeps what fits the engine, drops anything else', () => {
    const { signals } = toExtraction(
      {
        ...blank,
        needs: [
          { area: 'ADHD', confidence: 'high', quote: 'with ADHD' },
          { area: 'Made-up area', confidence: 'high', quote: '' },
          { area: 'ADHD', confidence: 'low', quote: '' },
        ],
        preferences: [
          { dimension: 'consultation_pace', value: 'unhurried', confidence: 'high', quote: 'appointments feel rushed' },
          { dimension: 'communication_directness', value: 'very-blunt', confidence: 'high', quote: '' },
          { dimension: 'not_a_dimension', value: 'x', confidence: 'high', quote: '' },
        ],
        mode: 'telehealth_only',
        age: 31,
      },
      text,
    );
    expect(signals.clinicalNeeds).toEqual([{ area: 'ADHD', confidence: 'high', quote: 'with ADHD' }]);
    expect(signals.preferences).toEqual({ consultation_pace: { value: 'unhurried', confidence: 'high', quote: 'appointments feel rushed' } });
    expect(signals.constraints).toEqual({ mode: 'telehealth_only', age: 31 });
  });

  it('only keeps quotes that are really in what the patient wrote', () => {
    const { signals } = toExtraction({ ...blank, needs: [{ area: 'Anxiety', confidence: 'medium', quote: 'I am very anxious' }] }, text);
    expect(signals.clinicalNeeds[0].quote).toBeUndefined();
  });

  it('maps cost, weekends, gender and loosening', () => {
    expect(toExtraction({ ...blank, cost: 'bulk_billed_only' }, text).signals.constraints.maxGap).toBe(0);
    expect(toExtraction({ ...blank, cost: 'no_concern' }, text).signals.constraints.maxGap).toBeNull();
    expect(toExtraction({ ...blank, cost: 'budget', max_gap_dollars: 80 }, text).signals.constraints.maxGap).toBe(80);
    expect(toExtraction({ ...blank, cost: 'budget', max_gap_dollars: -5 }, text).signals.constraints.maxGap).toBeUndefined();
    expect(toExtraction({ ...blank, weekend: 'needs_weekend' }, text).signals.constraints.needsWeekend).toBe(true);
    expect(toExtraction({ ...blank, clinician_gender: 'any', distance: 'happy_to_travel' }, text).relax).toEqual({ dropGender: true, dropDistance: true });
    expect(toExtraction({ ...blank, urgent: true, urgent_reason: 'chest pain' }, text).signals.safetyFlag).toEqual({ level: 'urgent', reason: 'chest pain' });
  });

  it('asks only for areas and scales the engine knows', () => {
    expect(AREAS).toContain('ADHD');
    expect(SCHEMA.properties.needs.items.properties.area.enum).toEqual(AREAS);
    expect(SYSTEM).toContain('consultation_pace: brisk | standard | unhurried');
    expect(JSON.stringify(SCHEMA)).not.toMatch(/"required":\[\]/);
  });
});

describe('POST /api/extract', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env, ANTHROPIC_API_KEY: 'test-key' };
    mockCreate.mockReset();
  });
  afterAll(() => {
    process.env = env;
  });

  it('is off without an API key, so the app uses its keyword extractor', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(await api.GET().json()).toEqual({ enabled: false });
    expect((await post({ text: 'ADHD' })).status).toBe(503);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns validated signals', async () => {
    mockCreate.mockResolvedValue(reply({ ...blank, needs: [{ area: 'Trauma', confidence: 'high', quote: 'trauma' }], mode: 'telehealth_only' }));
    const r = await post({ text: 'I want help with trauma, online only', profession: 'psychologist' });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.signals).toMatchObject({ profession: 'psychologist', constraints: { mode: 'telehealth_only' } });
    expect(body.signals.clinicalNeeds[0].area).toBe('Trauma');
    const req = mockCreate.mock.calls[0][0];
    expect(req).toMatchObject({ model: 'claude-opus-5', fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'] });
    expect(req.output_config.format.type).toBe('json_schema');
  });

  it('falls back (503) on a refusal, an API error or bad output', async () => {
    mockCreate.mockResolvedValueOnce(reply(blank, 'refusal'));
    expect((await post({ text: 'hello' })).status).toBe(503);
    mockCreate.mockRejectedValueOnce(new Error('network'));
    expect((await post({ text: 'hello' })).status).toBe(503);
    mockCreate.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] });
    expect((await post({ text: 'hello' })).status).toBe(503);
  });

  it('rejects empty or oversized messages', async () => {
    expect((await post({ text: '' })).status).toBe(400);
    expect((await post({ text: 'x'.repeat(5000) })).status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("the app with Claude's reading", () => {
  it('matches the same way as the scripted demo when Claude reads it the same', () => {
    for (const d of demos.filter((x) => x.profession !== 'either')) {
      const scripted = core.demoResults(d.id);
      const t = core.submitText(core.chooseProfession(core.initialState(), d.profession).state, d.text, { signals: d.signals, relax: {} });
      expect(t.state.input.demoId).toBeUndefined();
      const a = signalsFor(t.state.input);
      const b = signalsFor(core.runDemo(d.id).state.input);
      expect(a.clinicalNeeds).toEqual(b.clinicalNeeds);
      expect(a.preferences).toEqual(b.preferences);
      expect(scripted.result).toBeDefined();
    }
  });

  it("uses Claude's reading of a refinement, including loosening", () => {
    const s0 = core.refine(core.demoResults('gp-female'), 'Online only').state;
    const t = core.refine(s0, 'honestly any gender is fine', { signals: { clinicalNeeds: [], preferences: {}, constraints: {} }, relax: { dropGender: true } });
    expect(signalsFor(t.state.input).constraints.clinicianGender).toBeUndefined();
    expect(t.state.chat!.at(-1)!.text).toContain('any gender');
  });

  it('still pauses for safety if either reading flags urgent wording', () => {
    const t = core.submitText(core.initialState('gp'), 'I have chest pain', { signals: { clinicalNeeds: [], preferences: {}, constraints: {} }, relax: {} });
    expect(t.route).toBe('/safety');
  });
});

describe('POST /api/extract guards', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env, ANTHROPIC_API_KEY: 'test-key' };
    mockCreate.mockReset();
  });
  afterAll(() => {
    process.env = env;
  });

  it('refuses other sites without calling Claude', async () => {
    const r = await api.POST(new Request('http://x/api/extract', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{"text":"hi"}' }));
    expect(r.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
