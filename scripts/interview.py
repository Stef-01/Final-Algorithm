#!/usr/bin/env python3
"""Clinician onboarding interview pipeline (docs/clinician-interview.md, PRD §22–26).

    python3 scripts/interview.py new <id>                      # template -> <dir>/<id>/interview.json
    python3 scripts/interview.py pull [--clear]                # Join WATL submissions -> <dir>/<id>/interview.json (needs KV_REST_API_URL/TOKEN)
    python3 scripts/interview.py propose <id>                  # Claude drafts proposals for unfilled answers (needs `pip install anthropic`)
    python3 scripts/interview.py ingest <id>                   # validate  -> <dir>/<id>/draft.json
    python3 scripts/interview.py review <id>                   # approve   -> <dir>/<id>/approved.json (interactive)
    python3 scripts/interview.py review <id> --decisions f.json  # approve non-interactively
    python3 scripts/interview.py collect                       # all approved.json -> server/data/interviews.json
    python3 scripts/interview.py live <id> [--send]            # the "you're live" email (prints it; --send needs RESEND_API_KEY, WATL_EMAIL_FROM)

--dir defaults to server/data/interviews. Every excerpt must appear word for word in the recorded answer,
every value must be on the dimension's scale, and patient-facing lines must follow the copy rules. Nothing
is approved without a reviewer decision. Claude's proposals (`propose`) are only drafts: they go through
the same checks in `ingest` and still need a reviewer's decision in `review`.
"""
import argparse
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_DIR = ROOT / 'server' / 'data' / 'interviews'
COLLECTED = ROOT / 'server' / 'data' / 'interviews.json'
TYPES = ROOT / 'server' / 'engine' / 'types.ts'

BANNED = re.compile(r'\b(caring|compassionate|holistic|warm|patient-cent(red|ered)|thorough|understanding)\b', re.I)
WINNER = re.compile(r'perfect match|best doctor|ideal clinician|number one', re.I)
CONFIDENCE = ('low', 'medium', 'high')

# (id, domain, dimension or None, prompt). Mirrors the table in docs/clinician-interview.md.
SCENARIOS = [
    ('expertise', 'Clinical expertise', 'expertise', 'Which presentations do you most enjoy working with, and which do you refer on?'),
    ('complexity', 'Preferred complexity', 'uncertainty_tolerance', 'A patient arrives with four overlapping problems and 15 minutes booked. What do you do?'),
    ('diagnostic', 'Diagnostic curiosity', 'diagnostic_style', "Symptoms don't fit a clear diagnosis after the first visit. What happens next?"),
    ('investigation', 'Investigation threshold', 'diagnostic_style', "A patient asks for a test you don't think is needed. Walk me through the conversation."),
    ('directness', 'Communication directness', 'communication_directness', "You need to tell a patient a result isn't what they hoped. How do you say it?"),
    ('explanation', 'Explanation depth', 'explanation_depth', "A patient asks why you're recommending a plan. How much do you explain, and how?"),
    ('sdm', 'Shared decision-making', 'shared_decision_making', "A patient strongly prefers a treatment you don't initially recommend. Walk me through the consultation."),
    ('autonomy', 'Patient autonomy', 'patient_autonomy', 'A patient wants to make a decision you have reservations about. What do you do?'),
    ('medication', 'Medication philosophy', 'medication_philosophy', 'A patient asks whether they should start medication. How do you approach it?'),
    ('lifestyle', 'Lifestyle integration', 'lifestyle_integration', "A patient's main issue seems linked to sleep, exercise and routine. What's in the plan?"),
    ('mental_health', 'Mental health integration', 'mental_health_integration', 'A patient comes in about ADHD medication but mentions poor sleep and stress.'),
    ('pace', 'Consultation pace', 'consultation_pace', 'Walk me through a first appointment with a new patient, minute by minute.'),
    ('continuity', 'Continuity', 'continuity', 'How do you handle patients seeing other clinicians in your practice?'),
    ('follow_up', 'Follow-up intensity', 'follow_up_intensity', 'What happens between appointments for your ongoing patients?'),
    ('coordination', 'Care coordination', 'care_coordination', 'A patient is also seeing a psychologist and a specialist. How do you work with them?'),
    ('uncertainty', 'Comfort with uncertainty', 'uncertainty_tolerance', "Tell me about a case you still don't fully understand. How did you manage it?"),
    ('scope', 'Boundaries and scope', None, "What would you tell a patient you can't help them with, and where would you send them?"),
    ('structure', 'Consultation structure', 'consultation_pace', 'How do you end an appointment? What does the patient leave with?'),
    ('patient_behaviours', 'Preferred patient behaviours', None, 'What helps a patient get the most out of working with you?'),
    ('logistics', 'Practice logistics', 'practical', 'Fees and rebates, typical wait for a new patient, weekend or after-hours times, telehealth, new patients.'),
    ('therapy_style', 'Therapy style (psychologists)', 'therapy_style', 'A client asks for "tools to fix this". How do you respond, and what does a typical session look like?'),
    ('affirming', 'Neurodiversity-affirming care (psychologists)', 'neurodiversity_affirming', 'A client says they want to stop being "so ADHD". Walk me through how you\'d work with that.'),
]

PRACTICAL_FIELDS = {
    'fee': (int, float, type(None)),
    'gapAfterMedicare': (int, float, type(None)),
    'daysUntilAvailable': (int, type(None)),
    'weekends': (bool, type(None)),
    'newPatients': (bool, type(None)),
    'initialConsultMins': (int, type(None)),
}


def scales():
    """Read the ordered scales from server/engine/types.ts so the two never drift apart."""
    src = TYPES.read_text()
    block = src[src.index('export const DIMENSIONS = {'):src.index('} as const;', src.index('export const DIMENSIONS = {'))]
    return {m.group(1): re.findall(r"'([a-z_]+)'", m.group(2)) for m in re.finditer(r'^\s+(\w+): \[([^\]]*)\]', block, re.M)}


def fail(msg):
    sys.exit(f'error: {msg}')


def paths(args):
    base = pathlib.Path(args.dir)
    return base / args.id


def cmd_new(args):
    d = paths(args)
    d.mkdir(parents=True, exist_ok=True)
    out = d / 'interview.json'
    if out.exists() and not args.force:
        fail(f'{out} exists (use --force to overwrite)')
    doc = dict(
        clinicianId=args.id,
        interviewDate='',
        interviewer='',
        consent=False,
        practical={k: None for k in PRACTICAL_FIELDS},
        # For each practical fact you fill in: the clinician's words from the logistics answer.
        practicalSaid={k: '' for k in PRACTICAL_FIELDS},
        answers=[
            dict(scenario=sid, domain=domain, dimension=dim, prompt=prompt, answer='', excerpt='',
                 proposed=dict(value=None, area=None, level=None, confidence='medium', patientFacing=''))
            for sid, domain, dim, prompt in SCENARIOS
        ],
    )
    out.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
    print(f'wrote {out}')


def validate(doc):
    """Return (drafts, practical, problems)."""
    scale = scales()
    problems, drafts = [], []
    if not doc.get('consent'):
        problems.append('consent is not recorded (set "consent": true once the clinician has agreed)')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', doc.get('interviewDate') or ''):
        problems.append('interviewDate must be YYYY-MM-DD')
    known = {s[0]: s for s in SCENARIOS}
    for a in doc['answers']:
        sid, dim = a['scenario'], a.get('dimension')
        if sid not in known:
            problems.append(f'{sid}: unknown scenario')
            continue
        p = a.get('proposed') or {}
        if not a.get('answer', '').strip() or dim in (None, 'practical'):
            continue  # unanswered, notes-only or logistics
        where = f'{sid}'
        excerpt = a.get('excerpt', '').strip()
        if not excerpt:
            problems.append(f'{where}: answered but no excerpt chosen')
            continue
        if excerpt not in a['answer']:
            problems.append(f'{where}: excerpt is not word for word in the answer: {excerpt!r}')
        line = (p.get('patientFacing') or '').strip()
        if not line:
            problems.append(f'{where}: no patient-facing line')
        elif BANNED.search(line) or WINNER.search(line) or re.search(r'\d\s*%', line):
            problems.append(f'{where}: patient-facing line breaks the copy rules: {line!r}')
        if p.get('confidence') not in CONFIDENCE:
            problems.append(f'{where}: confidence must be one of {CONFIDENCE}')
        if dim == 'expertise':
            if not p.get('area') or p.get('level') not in ('particular', 'general'):
                problems.append(f'{where}: expertise needs an area and a level (particular/general)')
        elif p.get('value') not in scale.get(dim, []):
            problems.append(f'{where}: {p.get("value")!r} is not on the {dim} scale {scale.get(dim)}')
        drafts.append(dict(scenario=sid, dimension=dim, value=p.get('value'), area=p.get('area'), level=p.get('level'),
                           confidence=p.get('confidence'), excerpt=excerpt, patientFacing=line, prompt=a['prompt'],
                           **({'proposedBy': p['proposedBy']} if p.get('proposedBy') else {})))
    # Practice facts overwrite "not published" on a real profile, so each needs the clinician's own
    # words from the logistics answer, and any number must appear in those words.
    logistics = next((a.get('answer', '') for a in doc.get('answers', []) if a.get('scenario') == 'logistics'), '')
    said = doc.get('practicalSaid') or {}
    practical = {}
    for k, v in (doc.get('practical') or {}).items():
        if k not in PRACTICAL_FIELDS:
            problems.append(f'practical.{k}: unknown field')
        elif not isinstance(v, PRACTICAL_FIELDS[k]):
            problems.append(f'practical.{k}: wrong type')
        elif v is not None:
            quote = (said.get(k) or '').strip()
            if not quote:
                problems.append(f'practical.{k}: say where it came from (practicalSaid.{k}, from the logistics answer)')
            elif quote not in logistics:
                problems.append(f'practical.{k}: practicalSaid is not word for word in the logistics answer: {quote!r}')
            elif isinstance(v, (int, float)) and not isinstance(v, bool) and k != 'gapAfterMedicare' and not re.search(rf'(?<!\d){v:g}(?!\d)', quote):
                problems.append(f'practical.{k}: {v} does not appear in what they said: {quote!r}')
            practical[k] = v
    fee, gap = practical.get('fee'), practical.get('gapAfterMedicare')
    if fee is not None and gap is not None and gap > fee:
        problems.append('practical: the out-of-pocket gap is more than the fee')
    return drafts, practical, problems


MODEL = 'claude-opus-5'


def first_name(cid):
    return cid.split('-')[0].capitalize()


def proposal_schema(scale):
    dims = sorted(scale)
    return {
        'type': 'object',
        'additionalProperties': False,
        'required': ['proposals'],
        'properties': {'proposals': {'type': 'array', 'items': {
            'type': 'object',
            'additionalProperties': False,
            'required': ['scenario', 'value', 'area', 'level', 'confidence', 'excerpt', 'patientFacing'],
            'properties': {
                'scenario': {'type': 'string', 'enum': [sid for sid, *_ in SCENARIOS]},
                'value': {'type': 'string', 'enum': sorted({v for d in dims for v in scale[d]} | {'none'})},
                'area': {'type': 'string'},
                'level': {'type': 'string', 'enum': ['particular', 'general', 'none']},
                'confidence': {'type': 'string', 'enum': list(CONFIDENCE)},
                'excerpt': {'type': 'string'},
                'patientFacing': {'type': 'string'},
            },
        }}},
    }


PROPOSE_SYSTEM = """You help a reviewer turn a clinician's interview answers into draft matching traits. A human reviews every draft before anything is used, so when an answer doesn't clearly show a trait, say "none" rather than guessing.

For each answer you're given, return:
- value: a point on that dimension's scale (listed with the answer), or "none" if the answer doesn't show it.
- For the "expertise" dimension instead: area (a short name such as "Adult ADHD") and level ("particular" if it's a focus, "general" otherwise); value "none".
- confidence: "high" if the answer states it outright, "medium" if it's a fair reading, "low" otherwise.
- excerpt: the shortest phrase from the answer that shows it, copied exactly, character for character.
- patientFacing: one plain sentence a patient will read, about what the clinician does, using their first name. Describe behaviour, not virtues: never "caring", "compassionate", "holistic", "warm", "thorough", "understanding" or "patient-centred", no percentages, no "best" or "perfect"."""


def propose_answers(doc, client, name=None):
    """Fill in Claude's draft for every answer that has text but no proposal yet. Returns (filled, skipped)."""
    scale = scales()
    name = name or first_name(doc['clinicianId'])
    todo = [a for a in doc['answers'] if a.get('answer', '').strip() and a.get('dimension') not in (None, 'practical')
            and not (a.get('proposed') or {}).get('patientFacing')]
    if not todo:
        return [], []
    listing = '\n\n'.join(
        f"scenario: {a['scenario']}\ndimension: {a['dimension']}"
        + (f"\nscale: {' | '.join(scale[a['dimension']])}" if a['dimension'] in scale else '')
        + f"\nquestion: {a['prompt']}\nanswer: {a['answer']}"
        for a in todo)
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=['server-side-fallback-2026-07-01'],
        fallbacks='default',
        output_config={'format': {'type': 'json_schema', 'schema': proposal_schema(scale)}},
        system=PROPOSE_SYSTEM,
        messages=[{'role': 'user', 'content': f"The clinician's first name is {name}.\n\n{listing}"}],
    )
    if response.stop_reason != 'end_turn':
        fail(f'Claude stopped early ({response.stop_reason}); fill these in by hand')
    text = next((b.text for b in response.content if b.type == 'text'), '')
    try:
        proposals = {p['scenario']: p for p in json.loads(text)['proposals']}
    except (ValueError, KeyError, TypeError):
        fail('Claude returned something unreadable; fill these in by hand')
    filled, skipped = [], []
    for a in todo:
        p = proposals.get(a['scenario'])
        dim = a['dimension']
        why = None
        if not p:
            why = 'no proposal'
        elif p['excerpt'] not in a['answer'] or not p['excerpt'].strip():
            why = 'excerpt not word for word'
        elif BANNED.search(p['patientFacing']) or WINNER.search(p['patientFacing']) or re.search(r'\d\s*%', p['patientFacing']):
            why = 'patient-facing line breaks the copy rules'
        elif dim == 'expertise' and (not p['area'].strip() or p['level'] not in ('particular', 'general')):
            why = 'no area or level'
        elif dim != 'expertise' and p['value'] not in scale.get(dim, []):
            why = 'answer does not show a point on the scale' if p['value'] == 'none' else 'value not on the scale'
        if why:
            skipped.append((a['scenario'], why))
            continue
        a['excerpt'] = p['excerpt']
        a['proposed'] = dict(
            value=None if dim == 'expertise' else p['value'],
            area=p['area'].strip() if dim == 'expertise' else None,
            level=p['level'] if dim == 'expertise' else None,
            confidence=p['confidence'],
            patientFacing=p['patientFacing'].strip(),
            proposedBy='claude',
        )
        filled.append(a['scenario'])
    return filled, skipped


def write_pulled(base, drafts):
    """Write each Join WATL draft as <base>/<id>/interview.json, never over an existing file."""
    written, skipped = [], []
    for d in drafts:
        cid = re.sub(r'[^a-z0-9-]', '', str(d.get('clinicianId', '')))
        if not cid:
            continue
        f = pathlib.Path(base) / cid / 'interview.json'
        if f.exists():
            skipped.append(cid)
            continue
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
        written.append(cid)
    return written, skipped


def upstash(command):
    import os
    import urllib.request
    url = os.environ.get('KV_REST_API_URL') or os.environ.get('UPSTASH_REDIS_REST_URL')
    token = os.environ.get('KV_REST_API_TOKEN') or os.environ.get('UPSTASH_REDIS_REST_TOKEN')
    if not url or not token:
        fail('set KV_REST_API_URL and KV_REST_API_TOKEN (from Vercel → Storage → Upstash)')
    req = urllib.request.Request(url, data=json.dumps(command).encode(), method='POST',
                                 headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())['result']


def cmd_pull(args):
    raw = upstash(['LRANGE', 'watl:portal', '0', '-1'])
    drafts = [json.loads(x) for x in raw]
    written, skipped = write_pulled(args.dir, drafts)
    print(f'{len(written)} new drafts: {", ".join(written) or "none"}')
    for cid in skipped:
        print(f'  already here, not overwritten: {cid}')
    if args.clear and drafts:
        upstash(['LTRIM', 'watl:portal', str(len(drafts)), '-1'])
        print(f'cleared {len(drafts)} from the queue')
    print('next: review each (practicalSaid, consent), then propose / ingest / review')


def cmd_propose(args):
    d = paths(args)
    f = d / 'interview.json'
    doc = json.loads(f.read_text())
    try:
        import anthropic
    except ImportError:
        fail('install the Anthropic SDK first: pip install anthropic')
    filled, skipped = propose_answers(doc, anthropic.Anthropic(), args.name)
    f.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
    print(f'{len(filled)} drafted by Claude (marked proposedBy: claude); review them before ingest')
    for sid, why in skipped:
        print(f'  left for you: {sid} ({why})')


def cmd_ingest(args):
    d = paths(args)
    doc = json.loads((d / 'interview.json').read_text())
    drafts, practical, problems = validate(doc)
    if problems:
        fail('interview has problems:\n  - ' + '\n  - '.join(problems))
    out = dict(clinicianId=doc['clinicianId'], interviewDate=doc['interviewDate'], practical=practical,
               traits=[dict(t, reviewerStatus='draft') for t in drafts])
    (d / 'draft.json').write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n')
    print(f"{len(drafts)} draft traits -> {d / 'draft.json'}")


def ask(t):
    label = t['area'] if t['dimension'] == 'expertise' else f"{t['dimension']} = {t['value']}"
    who = ' — drafted by Claude, check it against the answer' if t.get('proposedBy') == 'claude' else ''
    print(f"\n[{t['scenario']}] {label} ({t['confidence']}){who}\n  said: “{t['excerpt']}”\n  line: {t['patientFacing']}")
    while True:
        choice = input('  (a)pprove / (e)dit line / (r)eject? ').strip().lower()
        if choice in ('a', 'r'):
            return 'approve' if choice == 'a' else 'reject'
        if choice == 'e':
            return {'patientFacing': input('  new line: ').strip()}


def cmd_review(args):
    d = paths(args)
    draft = json.loads((d / 'draft.json').read_text())
    decisions = json.loads(pathlib.Path(args.decisions).read_text()) if args.decisions else None
    evidence, phenotype, expertise = [], {}, []
    for t in draft['traits']:
        decision = decisions.get(t['scenario'], 'reject') if decisions is not None else ask(t)
        if decision == 'reject':
            continue
        line = decision['patientFacing'] if isinstance(decision, dict) else t['patientFacing']
        if BANNED.search(line) or WINNER.search(line):
            fail(f"{t['scenario']}: edited line breaks the copy rules: {line!r}")
        eid = f"{draft['clinicianId']}-interview-{t['scenario']}"
        evidence.append(dict(id=eid, trait=t['dimension'], excerpt=t['excerpt'], patientFacing=line, scenario=t['prompt'],
                             timestamp=f"{draft['interviewDate']}T00:00:00+10:00", confidence=t['confidence'],
                             reviewerStatus='approved'))
        if t['dimension'] == 'expertise':
            expertise.append(dict(area=t['area'], level=t['level'], evidenceIds=[eid]))
        elif t['dimension'] not in phenotype:  # first approved scenario for a dimension wins
            phenotype[t['dimension']] = dict(value=t['value'], confidence=t['confidence'], evidenceIds=[eid])
        else:
            phenotype[t['dimension']]['evidenceIds'].append(eid)
    out = dict(clinicianId=draft['clinicianId'], interviewDate=draft['interviewDate'], practical=draft['practical'],
               phenotype=phenotype, expertise=expertise, evidence=evidence)
    (d / 'approved.json').write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n')
    print(f"{len(evidence)} approved -> {d / 'approved.json'}")


def cmd_collect(args):
    base = pathlib.Path(args.dir)
    collected = {}
    for f in sorted(base.glob('*/approved.json')):
        doc = json.loads(f.read_text())
        collected[doc['clinicianId']] = doc
    out = pathlib.Path(args.out)
    out.write_text(json.dumps(collected, indent=2, ensure_ascii=False) + '\n')
    print(f'{len(collected)} approved interviews -> {out}')


SITE = 'https://final-algorithm.vercel.app'


def live_email(doc, collected):
    """The "you're live" email for an approved Join WATL professional, or fail() if they aren't live."""
    cid = doc.get('clinicianId', '')
    if cid not in collected:
        fail(f'{cid} is not live yet: approve their interview and run collect first')
    to = (doc.get('contact') or {}).get('email', '').strip()
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', to):
        fail(f'{cid} has no contact email (only Join WATL submissions do)')
    name = first_name(cid)
    shown = [k for k, v in (collected[cid].get('practical') or {}).items() if v is not None]
    lines = [
        f'Hi {name},',
        '',
        'Your WATL profile is live:',
        f'{SITE}/clinician/{cid}',
        '',
        'What patients now see, in your own words: ' + (', '.join(LABELS.get(k, k) for k in shown) or 'how you work') + '.',
        'Anything wrong or out of date? Reply to this email, or send an update through Join WATL:',
        f'{SITE}/join',
        '',
        'WATL receives no part of what patients pay you.',
        '',
        'The WATL team',
    ]
    return {'to': to, 'subject': 'You’re live on WATL', 'text': '\n'.join(lines)}


LABELS = {'fee': 'your fee', 'gapAfterMedicare': 'out-of-pocket cost', 'daysUntilAvailable': 'wait for new patients',
          'weekends': 'weekend appointments', 'newPatients': 'new patients', 'initialConsultMins': 'first appointment length'}


def cmd_live(args):
    f = pathlib.Path(args.dir) / args.id / 'interview.json'
    if not f.exists():
        fail(f'no interview for {args.id}')
    collected = json.loads(COLLECTED.read_text()) if COLLECTED.exists() else {}
    email = live_email(json.loads(f.read_text()), collected)
    if not args.send:
        print(f"To: {email['to']}\nSubject: {email['subject']}\n\n{email['text']}")
        return
    import os
    import urllib.request
    key, sender = os.environ.get('RESEND_API_KEY'), os.environ.get('WATL_EMAIL_FROM')
    if not key or not sender:
        fail('set RESEND_API_KEY and WATL_EMAIL_FROM to send (or leave off --send and send it yourself)')
    body = json.dumps({'from': sender, 'to': [email['to']], 'subject': email['subject'], 'text': email['text']}).encode()
    req = urllib.request.Request('https://api.resend.com/emails', data=body, method='POST',
                                 headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        print(f"sent to {email['to']} ({r.status})")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dir', default=str(DEFAULT_DIR))
    sub = ap.add_subparsers(dest='cmd', required=True)
    n = sub.add_parser('new')
    n.add_argument('id')
    n.add_argument('--force', action='store_true')
    pl = sub.add_parser('pull')
    pl.add_argument('--clear', action='store_true', help='remove the pulled submissions from the queue')
    pr = sub.add_parser('propose')
    pr.add_argument('id')
    pr.add_argument('--name', help="clinician's first name for patient-facing lines (default: from the id)")
    sub.add_parser('ingest').add_argument('id')
    r = sub.add_parser('review')
    r.add_argument('id')
    r.add_argument('--decisions')
    c = sub.add_parser('collect')
    c.add_argument('--out', default=str(COLLECTED))
    lv = sub.add_parser('live')
    lv.add_argument('id')
    lv.add_argument('--send', action='store_true')
    args = ap.parse_args(argv)
    {'new': cmd_new, 'pull': cmd_pull, 'propose': cmd_propose, 'ingest': cmd_ingest, 'review': cmd_review, 'collect': cmd_collect, 'live': cmd_live}[args.cmd](args)


if __name__ == '__main__':
    main()
