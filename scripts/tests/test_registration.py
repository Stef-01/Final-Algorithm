"""Tests for scripts/registration.py: only real AHPRA professions and well-formed numbers."""
import datetime
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('registration', ROOT / 'scripts' / 'registration.py')
reg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reg)
TODAY = datetime.date(2026, 9, 26)


class RegistrationChecks(unittest.TestCase):
    def test_a_well_formed_number_for_the_profession_passes(self):
        self.assertEqual(reg.check('psychologist', 'PSY0001234567', '2026-09-26', TODAY), [])
        self.assertEqual(reg.check('gp', 'MED0009876543', '2026-09-01', TODAY), [])

    def test_the_prefix_must_match_the_profession(self):
        self.assertTrue(reg.check('psychologist', 'MED0001234567', '2026-09-26', TODAY))
        self.assertTrue(reg.check('psychologist', 'PSY123', '2026-09-26', TODAY))

    def test_professions_ahpra_does_not_register_are_refused(self):
        for p in ('adhd_coach', 'exercise_physiologist', 'neurotherapist'):
            self.assertIn('not registered with AHPRA', reg.check(p, 'PSY0001234567', '2026-09-26', TODAY)[0])

    def test_the_check_date_must_be_real_and_not_in_the_future(self):
        self.assertTrue(reg.check('gp', 'MED0009876543', '2026-13-01', TODAY))
        self.assertTrue(reg.check('gp', 'MED0009876543', '2026-10-01', TODAY))


if __name__ == '__main__':
    unittest.main()
