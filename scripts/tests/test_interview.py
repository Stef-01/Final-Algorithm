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
