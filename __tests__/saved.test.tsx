import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { toSavedItem } from '@/features/match/saved';
import { demoResults } from '@/features/match/sessionCore';

// Saved keeps the id, fit label and date only: reasons repeat what the patient said about their
// health, and those stay with the 24-hour search (docs/privacy.md).

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout').default,
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': () => null,
  '(tabs)/saved': require('@/app/(tabs)/saved').default,
  '(tabs)/settings': () => null,
};

beforeEach(() => AsyncStorage.clear());

describe('Saved', () => {
  const r = demoResults('psych-trauma-online').result;
  const match = r?.status === 'matches' ? r.matches[0] : undefined;

  it('keeps no reasons', () => {
    expect(match!.reasons.length).toBeGreaterThan(0);
    const item = toSavedItem(match!, new Date('2026-09-25T10:00:00Z'));
    expect(item).toEqual({ clinicianId: match!.clinicianId, fit: match!.fit, savedAt: '2026-09-25' });
    expect(JSON.stringify(item)).not.toMatch(/trauma|looking for/i);
  });

  it('strips reasons saved by an older version when it loads', async () => {
    await AsyncStorage.setItem('watl_saved', JSON.stringify([match]));
    renderRouter(routes, { initialUrl: '/saved' });
    expect(await screen.findByLabelText('Alice Bui, Psychologist')).toBeOnTheScreen();
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('watl_saved');
      expect(stored).not.toMatch(/reasons|looking for help/);
      expect(JSON.parse(stored!)[0]).toMatchObject({ clinicianId: 'alice-bui', fit: match!.fit });
    });
  });
});

describe('restoring Saved', () => {
  it('keeps valid entries only, once each', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { restoreSaved } = require('@/features/match/saved') as typeof import('@/features/match/saved');
    expect(restoreSaved({ not: 'a list' })).toEqual([]);
    expect(
      restoreSaved([
        { clinicianId: 'alice-bui', fit: 'Good fit', savedAt: '2026-09-20' },
        { clinicianId: 'alice-bui', fit: 'Good fit' },
        { fit: 'Good fit' },
        { clinicianId: 'x', fit: 'Best fit ever' },
        null,
      ]),
    ).toEqual([{ clinicianId: 'alice-bui', fit: 'Good fit', savedAt: '2026-09-20' }]);
  });

  it('keeps who is in the care team, and only a real yes', () => {
    const { restoreSaved } = require('@/features/match/saved') as typeof import('@/features/match/saved');
    expect(
      restoreSaved([
        { clinicianId: 'alice-bui', fit: 'Good fit', savedAt: '2026-09-20', team: true },
        { clinicianId: 'bart-traynor', fit: 'Good fit', savedAt: '2026-09-20', team: 'yes' },
      ]),
    ).toEqual([
      { clinicianId: 'alice-bui', fit: 'Good fit', savedAt: '2026-09-20', team: true },
      { clinicianId: 'bart-traynor', fit: 'Good fit', savedAt: '2026-09-20' },
    ]);
  });
});
