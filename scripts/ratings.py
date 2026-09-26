#!/usr/bin/env python3
"""Summarise the anonymous care-team ratings for the WATL team (never shown to patients).

    python3 scripts/ratings.py            # needs KV_REST_API_URL / KV_REST_API_TOKEN (Vercel → Storage → Upstash)
    python3 scripts/ratings.py --min 5    # only professionals with at least 5 ratings

Per professional: how many ratings, the average, the spread of stars, and the notes to read. Showing
anything like this to patients waits on the AHPRA check (docs/privacy.md, VISION §2); notes may
contain health details and should be read by a person, not published.
"""
import argparse
import json
import os
import sys
import urllib.request

LIST = 'watl:practitioner'


def summarise(records, minimum=1):
    """[{clinicianId, stars, note?, day}] -> per professional, most-rated first."""
    by = {}
    for r in records:
        cid, stars = r.get('clinicianId'), r.get('stars')
        if not isinstance(cid, str) or stars not in (1, 2, 3, 4, 5):
            continue
        s = by.setdefault(cid, {'clinicianId': cid, 'count': 0, 'total': 0, 'spread': [0] * 5, 'notes': []})
        s['count'] += 1
        s['total'] += stars
        s['spread'][stars - 1] += 1
        if r.get('note'):
            s['notes'].append({'stars': stars, 'note': r['note'], 'day': r.get('day')})
    out = []
    for s in by.values():
        if s['count'] >= minimum:
            s['average'] = round(s.pop('total') / s['count'], 2)
            out.append(s)
    return sorted(out, key=lambda s: (-s['count'], s['clinicianId']))


def fetch():
    url = os.environ.get('KV_REST_API_URL') or os.environ.get('UPSTASH_REDIS_REST_URL')
    token = os.environ.get('KV_REST_API_TOKEN') or os.environ.get('UPSTASH_REDIS_REST_TOKEN')
    if not url or not token:
        sys.exit('error: set KV_REST_API_URL and KV_REST_API_TOKEN')
    req = urllib.request.Request(url, data=json.dumps(['LRANGE', LIST, '0', '-1']).encode(), method='POST',
                                 headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return [json.loads(x) for x in json.loads(r.read())['result']]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--min', type=int, default=1)
    args = ap.parse_args(argv)
    for s in summarise(fetch(), args.min):
        print(f"{s['clinicianId']}: {s['count']} ratings, average {s['average']}, stars 1–5 {s['spread']}")
        for n in s['notes']:
            print(f"    {n['stars']}★ {n['day']}: {n['note']}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
