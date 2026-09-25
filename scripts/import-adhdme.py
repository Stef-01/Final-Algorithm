#!/usr/bin/env python3
"""Import GP and psychologist profiles from the ADHDme site into WATL's clinician records.

    python3 scripts/import-adhdme.py --source ../revamped-adhd.me   # refresh the snapshot + portraits, then convert
    python3 scripts/import-adhdme.py                                # convert from the committed snapshot

Source of truth: CLINICIANS in revamped-adhd.me/scripts/build-profiles.py. The relevant fields are
snapshotted into server/data/adhdme/source.json so the conversion is reproducible without the repo.

Nothing here is invented. Every trait and every area of experience is backed by an excerpt that must
appear word for word in that clinician's published profile; the script stops if one doesn't. Traits
from profiles are marked reviewerStatus "profile" at medium confidence: usable for matching, but not
yet confirmed in an onboarding interview (docs/PLAN.md §8). Hand-entered practice facts (fees, rebates,
suburbs, age ranges) are checked against the profile text the same way, billing notes are the profile's
own words, and session length is read from the text. Anything a profile doesn't publish (fees,
availability, weekend hours, whether it takes new patients) stays null, and the engine never counts an
unknown as meeting a requirement.
"""
import argparse
import importlib.util
import json
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / 'server' / 'data' / 'adhdme' / 'source.json'
OUT = ROOT / 'server' / 'data' / 'professionals.json'
PORTRAITS = ROOT / 'assets' / 'clinicians'
TIMESTAMP = '2026-09-25T00:00:00+10:00'
CATEGORY = {'gp': 'gp', 'psychologist': 'psychologist'}

# ---------------------------------------------------------------- practice facts (from the profiles' own text)

PLACES = {
    'anubhav-saxena': ('Beecroft', 'Sydney', -33.749, 151.064),
    'anu-saxena': ('Double Bay', 'Sydney', -33.877, 151.243),
    'paula-garrido': ('Telehealth', 'Australia-wide', None, None),
    'jessica-katsamatsas': ('Ashgrove', 'Brisbane', -27.444, 152.986),
}
GOALS_PLACE = ('Fortitude Valley', 'Brisbane', -27.457, 153.034)
ARC_PLACE = ('Bundall', 'Gold Coast', -28.009, 153.405)

# Fees as published, checked against the profile text in check_facts(). The billing note shown to
# patients is the profile's own "Billing" line, word for word.
FEES = {  # id: (fee, out-of-pocket after rebate). None = not published.
    'anubhav-saxena': (299, 299),  # "$299 initial ... no Medicare rebate"
    'anu-saxena': (299, 299),
    'paula-garrido': (253, 104),  # "$253 per session, $149 Medicare rebate" -> 253 - 149
    'jessica-katsamatsas': (220, None),  # rebate amount not published
}

# (min age, max age, the words in the profile that say so)
AGE_RANGES = {'samantha-courtney': (13, 120, 'works with teenagers and adults'), 'jessica-katsamatsas': (18, 120, 'adults')}
IN_PERSON = {'paula-garrido': False}

# ---------------------------------------------------------------- evidence (excerpt must be verbatim)

# id: [(area, level, excerpt, patient-facing line)]
EXPERTISE = {
    'anubhav-saxena': [
        ('ADHD', 'particular', 'Structured adult ADHD assessment', 'Anubhav offers a structured adult ADHD assessment.'),
        ('Heart and metabolic health', 'particular', 'Baseline cardiovascular and metabolic screening',
         'Anubhav does baseline heart and metabolic screening before anything starts.'),
        ('Preventive health', 'particular', 'Integrative and preventive care', 'Anubhav lists integrative and preventive care among his experience.'),
        ('Chronic disease', 'particular', 'Chronic disease management', 'Anubhav manages chronic conditions.'),
    ],
    'anu-saxena': [
        ('ADHD', 'particular', 'Her clinical interests are ADHD, mental health',
         'Anu lists ADHD among her clinical interests and has completed an endorsed ADHD prescriber course.'),
        ('Mental health', 'particular', 'Brings a mental-health focus to general practice',
         'Anu brings a mental-health focus to general practice, with a psychology degree behind it.'),
        ("Women's health", 'particular', "women's health and functional medicine", "Anu lists women's health among her clinical interests."),
        ('Children', 'general', 'Diploma of Child Health', 'Anu holds a Diploma of Child Health.'),
    ],
    'paula-garrido': [
        ('ADHD', 'particular', 'ADHD-Certified Clinical Services Provider (ADHD-CCSP)', 'Paula is an ADHD-Certified Clinical Services Provider.'),
        ('Autism', 'particular', 'Certified Autism Spectrum Disorder Clinical Specialist (ASDCS)', 'Paula is a certified autism clinical specialist.'),
        ('Trauma', 'particular', 'additional training in ADHD, autism, complex trauma', 'Paula has additional training in complex trauma.'),
        ('Emotional regulation', 'particular', 'navigate challenges with emotional regulation, executive functioning, anxiety',
         'Paula helps with emotional regulation, executive functioning and anxiety.'),
        ('Anxiety', 'general', 'navigate challenges with emotional regulation, executive functioning, anxiety', 'Paula works with anxiety.'),
    ],
    'kate-row': [
        ('NDIS support', 'particular', 'supporting individuals and families through their NDIS journey',
         'Kate supports individuals and families through the NDIS.'),
        ('Disability', 'particular', 'working with clients with diffabilities/disabilities', 'Kate has a long-standing focus on working with people with disability.'),
        ('Children', 'particular', 'Kate works with toddlers, children, teenagers, and adults.', 'Kate works with toddlers and children as well as teens and adults.'),
        ('Career and performance', 'general', 'Career counselling and post-schooling decision making', 'Kate offers career counselling.'),
    ],
    'ellie-putland': [
        ('Young people', 'particular', 'particular passion for supporting young people who would like to reduce their stressors',
         'Ellie particularly enjoys helping young people bring their stress down.'),
        ('Stress', 'general', 'young people who would like to reduce their stressors', 'Ellie helps people reduce their stressors.'),
        ('Trauma', 'general', 'trauma-informed care framework', 'Ellie works from a trauma-informed care framework.'),
    ],
    'lachlan-avent': [
        ('ADHD assessment', 'particular', 'offers appointments for autism assessment and ADHD assessment', 'Lachlan offers ADHD and autism assessments.'),
        ('Autism assessment', 'particular', 'offers appointments for autism assessment and ADHD assessment', 'Lachlan offers ADHD and autism assessments.'),
        ('Parenting support', 'particular', 'certified Triple P Stepping Stones Parenting Program Practitioner',
         'Lachlan is a certified Triple P Stepping Stones parenting practitioner.'),
        ('ADHD', 'general', 'experienced working with clients who have autism, ADHD', 'Lachlan works with clients with ADHD and autism.'),
        ('Autism', 'general', 'experienced working with clients who have autism, ADHD', 'Lachlan works with clients with ADHD and autism.'),
        ('Anxiety', 'general', 'are experiencing anxiety', 'Lachlan works with anxiety.'),
        ('Burnout', 'general', 'stress / burn out', 'Lachlan works with stress and burnout.'),
    ],
    'samantha-courtney': [
        ('Eating disorders', 'particular', 'Credentialed Eating Disorder Clinician (CEDC-MH)', 'Samantha is a credentialed eating disorder clinician.'),
        ('Perinatal mental health', 'particular', 'Perinatal mental health, fertility', 'Samantha works with perinatal mental health and fertility.'),
        ('Trauma', 'particular', 'trauma and PTSD', 'Samantha works with trauma and PTSD.'),
        ('Life transitions', 'particular', 'major life transitions such as parenthood',
         'Samantha supports people through major life transitions such as parenthood or retiring.'),
        ('Anxiety', 'general', 'anxiety, depression, postnatal anxiety', 'Samantha works with anxiety and depression.'),
        ('Depression', 'general', 'anxiety, depression, postnatal anxiety', 'Samantha works with anxiety and depression.'),
    ],
    'lauren-poulos': [
        ('Children', 'particular', 'Early intervention with children, in clinic and at home',
         'Lauren does early intervention with children, in the clinic and at home.'),
        ('Parenting support', 'particular', 'Parent-Child Interaction Therapy (PCIT)', 'Lauren offers Parent-Child Interaction Therapy.'),
        ('ADHD', 'general', 'neurodivergence, autism, ADHD', 'Lauren works with ADHD and autism.'),
        ('Autism', 'general', 'neurodivergence, autism, ADHD', 'Lauren works with ADHD and autism.'),
        ('Emotional regulation', 'general', 'emotional regulation', 'Lauren works with emotional regulation.'),
        ('Anxiety', 'general', 'experiencing anxiety, depression', 'Lauren works with anxiety and depression.'),
    ],
    'alice-bui': [
        ('Trauma', 'particular', 'special clinical interests in evidence-based practice for clients who have experienced trauma',
         'Alice has a special interest in evidence-based care for people who have experienced trauma.'),
        ('Refugee and CALD clients', 'particular', 'particularly passionate about working with clients who are refugees',
         'Alice particularly works with refugee, newly arrived and culturally diverse clients.'),
        ('ADHD', 'general', 'autism, ADHD, intellectual disability', 'Alice works with ADHD and autism.'),
        ('Autism', 'general', 'autism, ADHD, intellectual disability', 'Alice works with ADHD and autism.'),
        ('Anxiety', 'general', 'trauma, PTSD, anxiety, depression', 'Alice works with anxiety and depression.'),
        ('Depression', 'general', 'trauma, PTSD, anxiety, depression', 'Alice works with anxiety and depression.'),
    ],
    'meera-lakhani': [
        ('ADHD assessment', 'particular', 'autism assessment, ADHD assessment and cognitive assessment',
         'Meera focuses on ADHD, autism and cognitive assessments.'),
        ('Autism assessment', 'particular', 'autism assessment, ADHD assessment and cognitive assessment',
         'Meera focuses on ADHD, autism and cognitive assessments.'),
        ('Cognitive assessment', 'particular', 'autism assessment, ADHD assessment and cognitive assessment',
         'Meera focuses on ADHD, autism and cognitive assessments.'),
        ('Young adults', 'particular', 'especially passionate about working with young adults and their families',
         'Meera especially enjoys working with young adults and their families.'),
    ],
    'jessica-katsamatsas': [
        ('Neurodivergent adults', 'particular', 'I work primarily with young neurodivergent adults', 'Jess works mainly with young neurodivergent adults.'),
        ('Anxiety', 'particular', 'navigating anxiety, burnout, low self-esteem, relationship difficulties',
         'Jess works with anxiety, burnout, self-esteem and relationship difficulties.'),
        ('Burnout', 'particular', 'navigating anxiety, burnout, low self-esteem, relationship difficulties',
         'Jess works with anxiety, burnout, self-esteem and relationship difficulties.'),
        ('Relationships', 'particular', 'navigating anxiety, burnout, low self-esteem, relationship difficulties',
         'Jess works with anxiety, burnout, self-esteem and relationship difficulties.'),
        ('Self-esteem', 'particular', 'navigating anxiety, burnout, low self-esteem, relationship difficulties',
         'Jess works with anxiety, burnout, self-esteem and relationship difficulties.'),
    ],
    'bart-traynor': [
        ('Career and performance', 'particular', 'career and performance pressures', 'Bart works with career and performance pressures.'),
        ('Life transitions', 'particular', 'major life transitions', 'Bart supports people through major life transitions.'),
    ],
    'jeff-leech': [
        ('Trauma', 'particular', 'recovering from trauma', 'Jeff works with people recovering from trauma.'),
        ('Anxiety', 'particular', 'managing anxiety or depression', 'Jeff helps with anxiety and depression.'),
        ('Depression', 'particular', 'managing anxiety or depression', 'Jeff helps with anxiety and depression.'),
        ('Career and performance', 'general', 'striving to perform at your best', 'Jeff works with people striving to perform at their best.'),
    ],
    'michael-rehardt': [],
}

# id: [(dimension, value, excerpt, patient-facing line)]
TRAITS = {
    'anubhav-saxena': [
        ('lifestyle_integration', 'high', 'ADHD is looked at alongside sleep, cardiovascular and metabolic health rather than on its own',
         'Anubhav looks at ADHD alongside sleep, heart and metabolic health rather than on its own.'),
        ('diagnostic_style', 'investigative', 'He works from measurement rather than impression',
         'Anubhav says he works from measurement rather than impression, with a documented baseline before anything starts.'),
        ('follow_up_intensity', 'scheduled', 'review at set intervals rather than only when a problem gets loud enough to prompt a call',
         'Anubhav reviews at set intervals, not only when a problem comes up.'),
        ('consultation_pace', 'unhurried', 'Long first appointment, scheduled reviews', "Anubhav's practice books a long first appointment."),
    ],
    'anu-saxena': [
        ('mental_health_integration', 'high', 'Brings a mental-health focus to general practice',
         'Anu brings a mental-health focus to general practice, backed by a Bachelor of Psychology.'),
        ('lifestyle_integration', 'high', 'completing further qualifications in functional medicine, nutrition, lifestyle medicine and health coaching',
         'Anu is completing further training in nutrition, lifestyle medicine and health coaching.'),
    ],
    'paula-garrido': [
        ('neurodiversity_affirming', 'high', 'neuroaffirming, and trauma-informed psychological care',
         'Paula describes her care as neuroaffirming and trauma-informed.'),
        ('shared_decision_making', 'shared', 'collaborative, and non-judgmental approach', 'Paula describes her approach as collaborative and non-judgmental.'),
        ('therapy_style', 'balanced', 'develop practical strategies, build self-understanding',
         'Paula works on practical strategies and on helping you make sense of yourself.'),
    ],
    'kate-row': [
        ('therapy_style', 'practical', 'toolkits of practical coping strategies', 'Kate focuses on building a toolkit of practical coping strategies.'),
        ('shared_decision_making', 'shared', 'working with clients to identify their goals and work towards achieving them',
         'Kate works with you to set your goals and work towards them.'),
    ],
    'ellie-putland': [
        ('care_coordination', 'high', 'wider support teams wherever helpful', 'Ellie liaises with your wider support team where it helps.'),
        ('shared_decision_making', 'shared', 'works collaboratively with families on psychoeducation towards their goals',
         'Ellie works collaboratively with families towards your goals.'),
        ('therapy_style', 'practical', 'develop and refine their psychological and coping skills', 'Ellie focuses on building psychological and coping skills.'),
    ],
    'lachlan-avent': [
        ('therapy_style', 'practical', 'build skills to live a life that fulfils them', 'Lachlan helps clients build skills to live the life they want.'),
    ],
    'samantha-courtney': [
        ('care_coordination', 'high', 'wider support teams such as dieticians, GPs and psychiatrists',
         'Samantha can liaise with your dietitian, GP and psychiatrist.'),
    ],
    'lauren-poulos': [
        ('therapy_style', 'practical', 'skills building and coping strategies', 'Lauren works on skills building and coping strategies.'),
        ('shared_decision_making', 'shared', 'a safe and collaborative space where clients can explore their goals',
         'Lauren describes a collaborative space where you explore your goals.'),
    ],
    'alice-bui': [
        ('shared_decision_making', 'shared', 'emphasises a safe collaborative space', 'Alice describes her therapy style as trauma-informed and collaborative.'),
    ],
    'meera-lakhani': [
        ('shared_decision_making', 'shared', 'working with clients to understand their goals then create a plan to achieve their goals',
         'Meera works with you to understand your goals, then plans how to reach them.'),
        ('care_coordination', 'high', 'collaborate with relevant stakeholders to maximise positive outcomes',
         'Meera works with the other people involved in your care.'),
    ],
    'jessica-katsamatsas': [
        ('neurodiversity_affirming', 'high', 'passionate about neurodiversity-affirming care',
         "Jess practises neurodiversity-affirming care: growth doesn't have to mean becoming less neurodivergent."),
        ('therapy_style', 'exploratory', 'hand you a list of strategies and send you on your way',
         "Jess says she won't just hand you a list of strategies; you work together to understand your patterns."),
        ('shared_decision_making', 'shared', 'We can figure out the rest together.',
         "Jess says you don't need the right words to start; you'll work out the rest together."),
    ],
    'bart-traynor': [
        ('communication_directness', 'direct', 'straight-talking Clinical Psychologist', 'Bart describes himself as straight-talking.'),
        ('therapy_style', 'practical', 'function better in everyday life',
         'Bart focuses on helping you function better in everyday life, not just feel better in the session.'),
        ('lifestyle_integration', 'high', 'brings together psychology, movement, physical rehabilitation, and performance',
         "Bart's practice brings psychology together with movement and physical rehabilitation."),
    ],
    'jeff-leech': [],
    'michael-rehardt': [],
}

# ---------------------------------------------------------------- snapshot + conversion

FIELDS = ['id', 'category', 'name', 'short', 'role', 'pronouns', 'practice', 'place', 'description', 'chips', 'telehealth',
          'book_href', 'qualifications', 'languages', 'experience', 'about', 'details']


def strip_html(s):
    return re.sub(r'<[^>]+>', '', str(s))


def refresh_snapshot(source):
    spec = importlib.util.spec_from_file_location('build_profiles', pathlib.Path(source) / 'scripts' / 'build-profiles.py')
    bp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bp)
    rows = []
    for c in bp.CLINICIANS:
        if c['category'] not in CATEGORY:
            continue
        row = {k: c.get(k) for k in FIELDS}
        row['details'] = [[k, strip_html(v)] for k, v in c['details']]
        rows.append(row)
        src = pathlib.Path(source) / 'assets' / 'clinicians' / f"{c['id']}-640.jpg"
        shutil.copyfile(src, PORTRAITS / f"{c['id']}.jpg")
    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + '\n')
    return rows


def corpus(c):
    parts = [c['description'], *c['chips'], *c['experience'], *c['about'], *(v for _, v in c['details'])]
    return '\n'.join(parts)


def detail(c, key):
    return next((v for k, v in c['details'] if k == key), '')


def gender(pronouns):
    return {'she/her': 'female', 'he/him': 'male', 'they/them': 'nonbinary'}.get(pronouns or '', 'undeclared')


def check_facts(c, text, suburb, fee, gap):
    """Hand-entered practice facts must be in the published profile too, like the trait excerpts."""
    cid = c['id']

    def need(cond, what):
        if not cond:
            sys.exit(f'{cid}: {what} is not in the published profile; fix the fact or remove it')

    if suburb != 'Telehealth':
        need(suburb in text, f'suburb {suburb!r}')
    if fee is not None:
        need(f'${fee}' in text, f'fee ${fee}')
        if gap == fee:
            need('no Medicare rebate' in text, 'no Medicare rebate')
        elif gap is not None:
            need(f'${fee - gap}' in text, f'Medicare rebate ${fee - gap}')
    if cid in AGE_RANGES:
        need(AGE_RANGES[cid][2] in text, f'age range wording {AGE_RANGES[cid][2]!r}')


def session_minutes(text):
    """Session length only when the profile states it ("50-minute sessions")."""
    m = re.search(r'(\d+)-min', text)
    return int(m.group(1)) if m else None


def convert(c):
    cid = c['id']
    text = corpus(c)
    evidence, expertise, phenotype = [], [], {}

    def check(excerpt):
        if excerpt not in text:
            sys.exit(f'{cid}: excerpt not found in the published profile: {excerpt!r}')

    for area, level, excerpt, line in EXPERTISE[cid]:
        check(excerpt)
        eid = f"{cid}-exp-{re.sub(r'[^a-z0-9]+', '-', area.lower()).strip('-')}"
        evidence.append(dict(id=eid, trait='expertise', excerpt=excerpt, patientFacing=line, scenario='Published ADHDme profile',
                             timestamp=TIMESTAMP, confidence='medium', reviewerStatus='profile'))
        expertise.append(dict(area=area, level=level, evidenceIds=[eid]))
    for dim, value, excerpt, line in TRAITS[cid]:
        check(excerpt)
        eid = f'{cid}-{dim}'
        evidence.append(dict(id=eid, trait=dim, excerpt=excerpt, patientFacing=line, scenario='Published ADHDme profile',
                             timestamp=TIMESTAMP, confidence='medium', reviewerStatus='profile'))
        phenotype[dim] = dict(value=value, confidence='medium', evidenceIds=[eid])

    goals = c['practice'] == 'GOALS Psychology'
    arc = c['practice'] == 'Atlantis Recovery Centre'
    suburb, city, lat, lng = GOALS_PLACE if goals else ARC_PLACE if arc else PLACES[cid]
    fee, gap = FEES.get(cid, (None, None))
    check_facts(c, text, suburb, fee, gap)
    published = detail(c, 'Billing').strip().rstrip(';')
    billing = (published[0].upper() + published[1:]) if published else 'Not published; ask the practice.'
    if fee is not None and gap is not None and gap != fee:
        billing += f' (about ${gap} out of pocket after the rebate)'
    modes = (['in_person'] if IN_PERSON.get(cid, True) else []) + (['telehealth'] if c['telehealth'] else [])
    first = c['name'].split()[1] if c['name'].startswith('Dr ') else c['name'].split()[0]
    if cid == 'jessica-katsamatsas':
        first = 'Jess'  # how she introduces herself on her profile
    access = detail(c, 'Wheelchair access')
    return dict(
        id=cid,
        name=c['name'],
        firstName=first,
        profession=CATEGORY[c['category']],
        role=c['role'],
        practice=c['practice'],
        location=dict(suburb=suburb, city=city, lat=lat, lng=lng),
        photo=f'{cid}.jpg',
        bio=' '.join(c['about']),
        credentials=[c['qualifications']] if c['qualifications'] else [],
        bookingUrl=c['book_href'],
        practical=dict(
            nextAvailable=detail(c, 'Appointments') or 'Times set with the practice',
            daysUntilAvailable=None,
            modes=modes,
            fee=fee,
            gapAfterMedicare=gap,
            billingNote=billing,
            newPatients=None,  # not published by any profile: unknown, not assumed
            ageRange=list(AGE_RANGES[cid][:2]) if cid in AGE_RANGES else [0, 120],
            languages=c['languages'] or [],
            accessibility=['wheelchair'] if access.startswith('Yes') else [],
            gender=gender(c['pronouns']),
            initialConsultMins=session_minutes(text),
            weekends=None,
        ),
        expertise=expertise,
        phenotype=phenotype,
        evidence=evidence,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', help='path to a revamped-adhd.me checkout; refreshes the snapshot and portraits')
    args = ap.parse_args()
    rows = refresh_snapshot(args.source) if args.source else json.loads(SNAPSHOT.read_text())
    missing = {r['id'] for r in rows} ^ set(EXPERTISE)
    if missing:
        sys.exit(f'trait maps and profiles differ: {sorted(missing)} (add or remove entries in EXPERTISE and TRAITS)')
    records = [convert(r) for r in rows]
    OUT.write_text(json.dumps(records, indent=2, ensure_ascii=False) + '\n')
    print(f'{len(records)} professionals -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
