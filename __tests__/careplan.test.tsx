import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { parsePractitionerRating } from '@server/feedback';

import * as prompt from '@/features/care/ratePrompt';
import { slotLabel, suggestSlot } from '@/features/care/slots';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': () => null,
  '(tabs)/saved': require('@/app/(tabs)/saved').default,
  '(tabs)/settings': () => null,
};

describe('suggested times', () => {
  const mon = new Date(2026, 8, 28, 8, 0); // Mon 28 Sep, 8 am
  it('starts after the practice’s usual wait, on a day they work', () => {
    expect(suggestSlot({ from: mon, waitDays: 0, weekends: false, now: mon })).toEqual(new Date(2026, 8, 28, 9));
    // A 5-day wait lands on Saturday: no weekends, so Monday.
    expect(suggestSlot({ from: mon, waitDays: 5, weekends: false, now: mon })).toEqual(new Date(2026, 9, 5, 9));
    expect(suggestSlot({ from: mon, waitDays: 5, weekends: true, now: mon })).toEqual(new Date(2026, 9, 3, 9));
  });

  it('skips the hours your calendar is busy', () => {
    const busy = [{ start: new Date(2026, 8, 28, 8, 30), end: new Date(2026, 8, 28, 11, 15) }];
    expect(suggestSlot({ from: mon, waitDays: 0, weekends: false, now: mon, busy })).toEqual(new Date(2026, 8, 28, 13));
    expect(slotLabel(new Date(2026, 8, 28, 13))).toBe('Mon 28 Sept · 1 pm');
  });
});

describe('rating someone on your care team', () => {
  it('asks now and then, about one person, and not again for two weeks', () => {
    const today = new Date('2026-09-26');
    expect(prompt.pickPrompt(['a', 'b'], {}, 0.99, today)).toBeNull();
    expect(prompt.pickPrompt(['a', 'b'], {}, 0, today)).toBe('a');
    expect(prompt.pickPrompt(['a', 'b'], {}, 0.3, today)).toBe('b');
    expect(prompt.pickPrompt(['a', 'b'], { a: '2026-09-20' }, 0, today)).toBe('b');
    expect(prompt.pickPrompt(['a'], { a: '2026-09-01' }, 0, today)).toBe('a');
    expect(prompt.pickPrompt([], {}, 0, today)).toBeNull();
  });

  it('keeps stars and a short note, anonymously', () => {
    expect(parsePractitionerRating({ kind: 'practitioner', clinicianId: 'alice-bui', stars: 4, note: '  Great   with   ADHD ', patient: 'x' })).toEqual({
      clinicianId: 'alice-bui',
      stars: 4,
      note: 'Great with ADHD',
    });
    expect(parsePractitionerRating({ kind: 'practitioner', clinicianId: 'alice-bui', stars: 6 })).toBeNull();
    expect(parsePractitionerRating({ clinicianId: 'alice-bui', stars: 3 })).toBeNull();
  });

  it('pops up on My care: stars, optional note, then thanks', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('watl_saved', JSON.stringify([{ clinicianId: 'alice-bui', fit: 'Good fit', savedAt: '2026-09-26', team: true }]));
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    (prompt.promptRoll as jest.Mock).mockReturnValueOnce(0);
    renderRouter(routes, { initialUrl: '/saved' });
    expect(await screen.findByText('How’s it going with Alice?')).toBeOnTheScreen();
    expect(screen.getByText('Anonymous · private')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    fireEvent.press(screen.getByLabelText('5 stars, Brilliant'));
    fireEvent.changeText(screen.getByLabelText('Feedback (optional)'), 'Explains things clearly');
    fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Thank you.')).toBeOnTheScreen();
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('watl_rate_asked'))!)).toHaveProperty('alice-bui'));
  });
});
