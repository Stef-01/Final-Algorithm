"""Tests for scripts/interview.py.  Run: python3 -m unittest discover scripts/tests"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts' / 'interview.py'
FIXTURES = ROOT / 'server' / 'fixtures' / 'interviews'


def run(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


class InterviewPipeline(unittest.TestCase):
    def setUp(self):
        self.dir = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dir)

    def copy(self, cid):
        (self.dir / cid).mkdir()
        shutil.copy(FIXTURES / cid / 'interview.json', self.dir / cid / 'interview.json')
        return json.loads((self.dir / cid / 'interview.json').read_text())

    def write(self, cid, doc):
        (self.dir / cid / 'interview.json').write_text(json.dumps(doc))

    def test_mock_interviews_reproduce_the_committed_approvals(self):
        for cid in ('amy-chen', 'tom-walsh', 'hannah-lee'):
            self.copy(cid)
            self.assertEqual(run('--dir', str(self.dir), 'ingest', cid).returncode, 0)
            r = run('--dir', str(self.dir), 'review', cid, '--decisions', str(FIXTURES / cid / 'decisions.json'))
            self.assertEqual(r.returncode, 0, r.stderr)
            got = json.loads((self.dir / cid / 'approved.json').read_text())
            want = json.loads((FIXTURES / cid / 'approved.json').read_text())
            self.assertEqual(got, want)

    def test_rejected_and_edited_decisions_are_honoured(self):
        tom = json.loads((FIXTURES / 'tom-walsh' / 'approved.json').read_text())
        self.assertNotIn('medication_philosophy', tom['phenotype'])
        amy = json.loads((FIXTURES / 'amy-chen' / 'approved.json').read_text())
        lines = [e['patientFacing'] for e in amy['evidence']]
        self.assertIn('Amy explains the plan until you could explain it to someone at home.', lines)
        self.assertTrue(all(e['reviewerStatus'] == 'approved' for e in amy['evidence']))

    def test_undecided_traits_are_not_approved(self):
        self.copy('amy-chen')
        run('--dir', str(self.dir), 'ingest', 'amy-chen')
        decisions = self.dir / 'none.json'
        decisions.write_text('{}')
        run('--dir', str(self.dir), 'review', 'amy-chen', '--decisions', str(decisions))
        self.assertEqual(json.loads((self.dir / 'amy-chen' / 'approved.json').read_text())['evidence'], [])

    def assertIngestFails(self, cid, doc, message):
        self.write(cid, doc)
        r = run('--dir', str(self.dir), 'ingest', cid)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn(message, r.stderr)

    def test_excerpt_must_be_word_for_word(self):
        doc = self.copy('amy-chen')
        next(a for a in doc['answers'] if a['scenario'] == 'pace')['excerpt'] = 'I always book an hour'
        self.assertIngestFails('amy-chen', doc, 'not word for word')

    def test_value_must_be_on_the_scale(self):
        doc = self.copy('amy-chen')
        next(a for a in doc['answers'] if a['scenario'] == 'pace')['proposed']['value'] = 'very slow'
        self.assertIngestFails('amy-chen', doc, 'not on the consultation_pace scale')

    def test_patient_facing_lines_follow_the_copy_rules(self):
        doc = self.copy('amy-chen')
        next(a for a in doc['answers'] if a['scenario'] == 'pace')['proposed']['patientFacing'] = 'Amy is warm and caring.'
        self.assertIngestFails('amy-chen', doc, 'copy rules')

    def test_consent_is_required(self):
        doc = self.copy('amy-chen')
        doc['consent'] = False
        self.assertIngestFails('amy-chen', doc, 'consent')

    def test_template_covers_every_scenario(self):
        r = run('--dir', str(self.dir), 'new', 'someone')
        self.assertEqual(r.returncode, 0)
        doc = json.loads((self.dir / 'someone' / 'interview.json').read_text())
        self.assertEqual(len(doc['answers']), 22)
        self.assertFalse(doc['consent'])


if __name__ == '__main__':
    unittest.main()


class ClaudeProposals(unittest.TestCase):
    """`propose` with a stand-in client: no network, no API spend."""

    def setUp(self):
        sys.path.insert(0, str(ROOT / 'scripts'))
        import interview
        self.iv = interview
        self.doc = json.loads((FIXTURES / 'amy-chen' / 'interview.json').read_text())
        # Pretend nobody has proposed anything yet for two answered scenarios.
        self.answered = [a for a in self.doc['answers'] if a['answer'].strip() and a['dimension'] not in (None, 'practical')]
        for a in self.answered:
            a['excerpt'] = ''
            a['proposed'] = dict(value=None, area=None, level=None, confidence='medium', patientFacing='')

    def client(self, proposals, stop_reason='end_turn'):
        calls = []

        class Block:
            type = 'text'
            text = json.dumps({'proposals': proposals})

        class Response:
            content = [Block()]

        Response.stop_reason = stop_reason

        class Messages:
            def create(self, **kw):
                calls.append(kw)
                return Response()

        class Beta:
            messages = Messages()

        class Client:
            beta = Beta()

        return Client(), calls

    def proposal(self, a, **over):
        words = a['answer'].split()
        p = dict(scenario=a['scenario'], value='none', area='', level='none', confidence='high',
                 excerpt=' '.join(words[:4]), patientFacing='Amy explains her reasoning before deciding.')
        if a['dimension'] == 'expertise':
            p.update(area='Adult ADHD', level='particular')
        else:
            p['value'] = self.iv.scales()[a['dimension']][0]
        p.update(over)
        return p

    def test_fills_valid_drafts_and_marks_them(self):
        client, calls = self.client([self.proposal(a) for a in self.answered])
        filled, skipped = self.iv.propose_answers(self.doc, client)
        self.assertEqual(sorted(filled), sorted(a['scenario'] for a in self.answered))
        self.assertEqual(skipped, [])
        for a in self.answered:
            self.assertEqual(a['proposed']['proposedBy'], 'claude')
            self.assertIn(a['excerpt'], a['answer'])
        req = calls[0]
        self.assertEqual(req['model'], 'claude-opus-5')
        self.assertEqual(req['fallbacks'], 'default')
        self.assertEqual(req['output_config']['format']['type'], 'json_schema')

    def test_rejects_invented_quotes_off_scale_values_and_banned_words(self):
        a, b, c = self.answered[:3]
        client, _ = self.client([
            self.proposal(a, excerpt='words the clinician never said'),
            self.proposal(b, patientFacing='Amy is warm and caring.'),
            self.proposal(c, value='extremely_high', area='', level='none') if c['dimension'] != 'expertise'
            else self.proposal(c, area=''),
        ])
        filled, skipped = self.iv.propose_answers(self.doc, client)
        self.assertEqual(filled, [])
        self.assertEqual({s for s, _ in skipped} >= {a['scenario'], b['scenario'], c['scenario']}, True)
        for x in (a, b, c):
            self.assertEqual(x['proposed']['patientFacing'], '')

    def test_never_overwrites_a_human_proposal(self):
        a = self.answered[0]
        a['proposed'] = dict(value=None, area='Adult ADHD', level='particular', confidence='high', patientFacing='Written by the interviewer.')
        client, calls = self.client([self.proposal(x) for x in self.answered])
        self.iv.propose_answers(self.doc, client)
        self.assertEqual(a['proposed']['patientFacing'], 'Written by the interviewer.')
        self.assertNotIn(f"scenario: {a['scenario']}\n", calls[0]['messages'][0]['content'])

    def test_claude_drafts_still_need_a_reviewer(self):
        client, _ = self.client([self.proposal(a) for a in self.answered])
        self.iv.propose_answers(self.doc, client)
        drafts, _, problems = self.iv.validate(self.doc)
        self.assertEqual(problems, [])
        self.assertTrue(all(d['proposedBy'] == 'claude' for d in drafts if d['scenario'] in {a['scenario'] for a in self.answered}))


class PracticalFactsNeedTheirSource(unittest.TestCase):
    """Practice facts overwrite 'not published' on a real profile, so each must trace to what was said."""

    def setUp(self):
        sys.path.insert(0, str(ROOT / 'scripts'))
        import interview
        self.iv = interview
        self.doc = json.loads((FIXTURES / 'amy-chen' / 'interview.json').read_text())

    def problems(self):
        return [p for p in self.iv.validate(self.doc)[2] if p.startswith('practical')]

    def test_the_mock_interview_traces_every_fact(self):
        self.assertEqual(self.problems(), [])

    def test_a_fact_without_its_source_is_refused(self):
        self.doc['practicalSaid']['fee'] = ''
        self.assertTrue(any('say where it came from' in p for p in self.problems()))

    def test_a_source_that_was_not_said_is_refused(self):
        self.doc['practicalSaid']['weekends'] = 'I work every Saturday'
        self.assertTrue(any('not word for word' in p for p in self.problems()))

    def test_a_number_must_be_in_what_was_said(self):
        self.doc['practical']['fee'] = 150
        self.assertTrue(any('150 does not appear' in p for p in self.problems()))

    def test_the_gap_cannot_be_more_than_the_fee(self):
        self.doc['practical']['gapAfterMedicare'] = 130
        self.assertIn('practical: the out-of-pocket gap is more than the fee', self.problems())


class PullFromJoinWatl(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(ROOT / 'scripts'))
        import interview
        self.iv = interview
        self.dir = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dir)

    def test_writes_new_drafts_and_never_overwrites(self):
        (self.dir / 'sam-lee').mkdir()
        (self.dir / 'sam-lee' / 'interview.json').write_text('{"kept": true}')
        written, skipped = self.iv.write_pulled(self.dir, [
            {'clinicianId': 'sam-lee', 'consent': True},
            {'clinicianId': 'alex-ng', 'consent': True},
            {'clinicianId': '../../etc', 'consent': True},
        ])
        self.assertEqual(written, ['alex-ng', 'etc'])
        self.assertEqual(skipped, ['sam-lee'])
        self.assertEqual(json.loads((self.dir / 'sam-lee' / 'interview.json').read_text()), {'kept': True})
        self.assertFalse((self.dir.parent / 'etc').exists() and (self.dir.parent / 'etc' / 'interview.json').exists())
