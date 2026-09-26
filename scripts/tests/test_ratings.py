"""Tests for scripts/ratings.py: the team's summary of care-team ratings."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('ratings', ROOT / 'scripts' / 'ratings.py')
rt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rt)


class Summary(unittest.TestCase):
    records = [
        {'clinicianId': 'alice-bui', 'stars': 5, 'day': '2026-09-20', 'note': 'Explains things clearly'},
        {'clinicianId': 'alice-bui', 'stars': 3, 'day': '2026-09-21'},
        {'clinicianId': 'bart-traynor', 'stars': 2, 'day': '2026-09-22', 'note': 'Language could be more neuro-affirming'},
        {'clinicianId': 'bad', 'stars': 9},
    ]

    def test_counts_averages_spread_and_notes(self):
        s = rt.summarise(self.records)
        self.assertEqual([x['clinicianId'] for x in s], ['alice-bui', 'bart-traynor'])
        self.assertEqual(s[0]['count'], 2)
        self.assertEqual(s[0]['average'], 4.0)
        self.assertEqual(s[0]['spread'], [0, 0, 1, 0, 1])
        self.assertEqual(s[1]['notes'][0]['note'], 'Language could be more neuro-affirming')

    def test_a_minimum_hides_thin_evidence(self):
        self.assertEqual([x['clinicianId'] for x in rt.summarise(self.records, 2)], ['alice-bui'])


if __name__ == '__main__':
    unittest.main()
