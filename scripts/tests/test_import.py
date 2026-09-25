"""Tests for scripts/import-adhdme.py: hand-entered facts must be in the published profile."""
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('import_adhdme', ROOT / 'scripts' / 'import-adhdme.py')
imp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imp)
SOURCE = {c['id']: c for c in json.loads(imp.SNAPSHOT.read_text())}


class PublishedFactsOnly(unittest.TestCase):
    def setUp(self):
        self.fees = dict(imp.FEES)
        self.ages = dict(imp.AGE_RANGES)
        self.places = dict(imp.PLACES)
        self.addCleanup(self.restore)

    def restore(self):
        imp.FEES.clear(); imp.FEES.update(self.fees)
        imp.AGE_RANGES.clear(); imp.AGE_RANGES.update(self.ages)
        imp.PLACES.clear(); imp.PLACES.update(self.places)

    def test_the_committed_facts_all_check_out(self):
        for c in SOURCE.values():
            imp.convert(c)

    def test_a_fee_the_profile_does_not_state_stops_the_import(self):
        imp.FEES['paula-garrido'] = (240, 104)
        with self.assertRaises(SystemExit) as e:
            imp.convert(SOURCE['paula-garrido'])
        self.assertIn('fee $240', str(e.exception))

    def test_a_wrong_rebate_stops_the_import(self):
        imp.FEES['paula-garrido'] = (253, 100)  # implies a $153 rebate
        with self.assertRaises(SystemExit):
            imp.convert(SOURCE['paula-garrido'])

    def test_a_suburb_the_profile_does_not_name_stops_the_import(self):
        imp.PLACES['anu-saxena'] = ('Bondi', 'Sydney', -33.89, 151.27)
        with self.assertRaises(SystemExit):
            imp.convert(SOURCE['anu-saxena'])

    def test_an_age_range_needs_its_wording(self):
        imp.AGE_RANGES['samantha-courtney'] = (10, 120, 'works with children')
        with self.assertRaises(SystemExit):
            imp.convert(SOURCE['samantha-courtney'])

    def test_billing_is_the_profile_s_own_words(self):
        r = imp.convert(SOURCE['jessica-katsamatsas'])
        self.assertTrue(r['practical']['billingNote'].startswith('$220 per session, Medicare rebate with a referral and Mental Health Care Plan'))
        self.assertIsNone(r['practical']['newPatients'])


if __name__ == '__main__':
    unittest.main()
