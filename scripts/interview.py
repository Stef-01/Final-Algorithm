#!/usr/bin/env python3
"""Clinician onboarding interview pipeline (docs/clinician-interview.md, PRD §22–26).

    python3 scripts/interview.py new <id>                      # template -> <dir>/<id>/interview.json
    python3 scripts/interview.py ingest <id>                   # validate  -> <dir>/<id>/draft.json
    python3 scripts/interview.py review <id>                   # approve   -> <dir>/<id>/approved.json (interactive)
    python3 scripts/interview.py review <id> --decisions f.json  # approve non-interactively
    python3 scripts/interview.py collect                       # all approved.json -> server/data/interviews.json

--dir defaults to server/data/interviews. Every excerpt must appear word for word in the recorded answer,
every value must be on the dimension's scale, and patient-facing lines must follow the copy rules. Nothing
is approved without a reviewer decision.
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
                           confidence=p.get('confidence'), excerpt=excerpt, patientFacing=line, prompt=a['prompt']))
    practical = {}
    for k, v in (doc.get('practical') or {}).items():
        if k not in PRACTICAL_FIELDS:
            problems.append(f'practical.{k}: unknown field')
        elif not isinstance(v, PRACTICAL_FIELDS[k]):
            problems.append(f'practical.{k}: wrong type')
        elif v is not None:
            practical[k] = v
    return drafts, practical, problems


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
    print(f"\n[{t['scenario']}] {label} ({t['confidence']})\n  said: “{t['excerpt']}”\n  line: {t['patientFacing']}")
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


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dir', default=str(DEFAULT_DIR))
    sub = ap.add_subparsers(dest='cmd', required=True)
    n = sub.add_parser('new')
    n.add_argument('id')
    n.add_argument('--force', action='store_true')
    sub.add_parser('ingest').add_argument('id')
    r = sub.add_parser('review')
    r.add_argument('id')
    r.add_argument('--decisions')
    c = sub.add_parser('collect')
    c.add_argument('--out', default=str(COLLECTED))
    args = ap.parse_args(argv)
    {'new': cmd_new, 'ingest': cmd_ingest, 'review': cmd_review, 'collect': cmd_collect}[args.cmd](args)


if __name__ == '__main__':
    main()
