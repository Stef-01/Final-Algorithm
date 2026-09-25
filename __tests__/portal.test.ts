/**
 * @jest-environment node
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { POST } from '../api/portal';
import { parseSubmission, toInterviewDraft } from '../server/portal';

const good = {
  name: 'Dr Sam Lee',
  email: 'sam@example.com',
  profession: 'psychologist',
  practice: 'Lee Psychology',
  suburb: 'Paddington',
  consent: true,
  facts: { fee: 220, gap: 91, waitDays: 7, weekends: true, telehealth: true, newPatients: true },
  inTheirWords: 'Sessions are $220, and with a Mental Health Treatment Plan the gap is about $91. New patients usually wait 7 days. I see people on Saturdays.',
  decisions: 'I lay out the options and we choose together.',
  betweenVisits: 'I send a short summary after each session.',
};

describe('Join WATL: what a professional submits', () => {
  it('accepts a complete, consistent submission', () => {
    const r = parseSubmission(good);
    expect('submission' in r && r.submission.facts.fee).toBe(220);
  });

  it.each([
    ['no consent', { ...good, consent: false }, 'consent'],
    ['a bad email', { ...good, email: 'sam' }, 'email'],
    ['an unknown profession', { ...good, profession: 'wizard' }, 'profession'],
    ['a fee not in their words', { ...good, facts: { ...good.facts, fee: 250 } }, 'fee-words'],
    ['a wait not in their words', { ...good, facts: { ...good.facts, waitDays: 14 } }, 'waitDays-words'],
    ['a gap over the fee', { ...good, facts: { ...good.facts, gap: 300 } }, 'gap-over-fee'],
    ['facts with no words at all', { ...good, inTheirWords: '' }, 'inTheirWords'],
  ])('refuses %s', (_why, body, problem) => {
    const r = parseSubmission(body);
    expect('problems' in r && r.problems).toContain(problem);
  });

  it("doesn't match a number inside another ('$1220' is not '$220')", () => {
    const r = parseSubmission({ ...good, inTheirWords: good.inTheirWords.replace('$220', '$1220') });
    expect('problems' in r && r.problems).toContain('fee-words');
  });
});

describe('the draft a reviewer gets', () => {
  const r = parseSubmission(good);
  if (!('submission' in r)) throw new Error('expected a submission');
  const draft = toInterviewDraft(r.submission, '2026-09-26');

  it("quotes each number's source from their own words", () => {
    const logistics = draft.answers.find((a) => a.scenario === 'logistics')!.answer;
    for (const [k, n] of [['fee', 220], ['daysUntilAvailable', 7]] as const) {
      const q = draft.practicalSaid[k];
      expect(logistics).toContain(q);
      expect(q).toMatch(new RegExp(`\\b${n}\\b`));
    }
    expect(draft.clinicianId).toBe('sam-lee');
  });

  it("passes the interview pipeline's practical-facts rules", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'portal-')), 'draft.json');
    fs.writeFileSync(file, JSON.stringify(draft));
    const check = 'import json,sys; sys.path.insert(0,"scripts"); import interview; d=json.load(open(sys.argv[1])); print(json.dumps([p for p in interview.validate(d)[2] if p.startswith("practical")]))';
    const out = execFileSync('python3', ['-c', check, file], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    expect(JSON.parse(out)).toEqual([]);
  });
});

describe('POST /api/portal', () => {
  const env = process.env;
  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });
  const post = (body: unknown, origin = 'http://x') =>
    POST(new Request('http://x/api/portal', { method: 'POST', headers: { origin }, body: JSON.stringify(body) }));

  it('says what to fix, and refuses other sites', async () => {
    const r = await post({ ...good, consent: false });
    expect(r.status).toBe(400);
    expect((await r.json()).problems).toContain('consent');
    expect((await post(good, 'https://evil.example')).status).toBe(403);
  });

  it('queues a draft interview for review when a store is connected', async () => {
    process.env = { ...env, KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 't' };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));
    const r = await post(good);
    expect(await r.json()).toEqual({ queued: true });
    const [[cmd, key, value]] = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect([cmd, key]).toEqual(['LPUSH', 'watl:portal']);
    expect(JSON.parse(value)).toMatchObject({ clinicianId: 'sam-lee', interviewer: expect.stringMatching(/needs review/) });
  });
});
