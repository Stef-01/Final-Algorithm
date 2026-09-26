#!/usr/bin/env python3
"""Record that a person checked a professional's registration on the public register.

WATL shows "Registration checked" (with the date) only for professionals recorded here, and only
after someone has looked them up on AHPRA's public register and seen the registration is current:
https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx

    python3 scripts/registration.py add paula-garrido PSY0001234567 --checked 2026-09-26
    python3 scripts/registration.py remove paula-garrido
    python3 scripts/registration.py list

Only professions AHPRA registers can be recorded (GPs, psychologists, OTs, physiotherapists).
ADHD coaches, exercise physiologists (accredited by ESSA, not AHPRA) and neurotherapy practitioners
have no AHPRA registration, so the script refuses them rather than implying one.
"""
import argparse
import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REGISTRATIONS = ROOT / 'server' / 'data' / 'registrations.json'
PROFESSIONALS = ROOT / 'server' / 'data' / 'professionals.json'

# AHPRA registration numbers: a three-letter profession code and ten digits.
PREFIX = {'gp': 'MED', 'psychologist': 'PSY', 'occupational_therapist': 'OCC', 'physiotherapist': 'PHY'}
NUMBER = re.compile(r'^[A-Z]{3}\d{10}$')


def load(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def check(profession, number, checked, today=None):
    """Problems with a registration record, or [] if it's fine."""
    problems = []
    if profession not in PREFIX:
        problems.append(f'{profession} is not registered with AHPRA')
    elif not NUMBER.match(number) or not number.startswith(PREFIX[profession]):
        problems.append(f'{number} is not an AHPRA {PREFIX[profession]} number (3 letters, 10 digits)')
    try:
        day = datetime.date.fromisoformat(checked)
        if day > (today or datetime.date.today()):
            problems.append('the check date is in the future')
    except ValueError:
        problems.append(f'{checked} is not a date (YYYY-MM-DD)')
    return problems


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('add')
    a.add_argument('id')
    a.add_argument('number')
    a.add_argument('--checked', default=datetime.date.today().isoformat())
    r = sub.add_parser('remove')
    r.add_argument('id')
    sub.add_parser('list')
    args = ap.parse_args(argv)

    regs = load(REGISTRATIONS, {})
    people = {c['id']: c for c in load(PROFESSIONALS, [])}
    if args.cmd == 'list':
        for k, v in sorted(regs.items()):
            print(f"{k}: {v['number']} (checked {v['checkedOn']})")
        return 0
    if args.id not in people:
        sys.exit(f'No professional with id {args.id}')
    if args.cmd == 'remove':
        regs.pop(args.id, None)
    else:
        problems = check(people[args.id]['profession'], args.number.upper(), args.checked)
        if problems:
            sys.exit('; '.join(problems))
        regs[args.id] = {'body': 'AHPRA', 'number': args.number.upper(), 'checkedOn': args.checked}
    REGISTRATIONS.write_text(json.dumps(regs, indent=2, sort_keys=True) + '\n')
    print(f'{args.cmd}: {args.id}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
