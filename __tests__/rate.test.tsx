import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { deckOf, demoResults } from '@/features/match/sessionCore';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': () => null,
  '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
  rate: require('@/app/rate').default,
};

const stored = async () => JSON.parse((await AsyncStorage.getItem('watl_session'))!).feedback;

// At the end of the deck, where the 1–5 rating is.
beforeEach(async () => {
  await AsyncStorage.clear();
  const s = demoResults('psych-trauma-online');
  await AsyncStorage.setItem('watl_session', JSON.stringify({ ...s, index: deckOf(s).length, updatedAt: Date.now() }));
});

describe('why you rated it that way', () => {
  it('a 5 asks what was good: preselected reasons, or Other in your words', async () => {
    renderRouter(routes, { initialUrl: '/matches' });
    fireEvent.press(await screen.findByLabelText('5 out of 5, Very well'));
    expect(await screen.findByText('What was good?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    fireEvent.press(screen.getByText('Clear why they fit'));
    fireEvent.press(screen.getByText('Other'));
    fireEvent.changeText(screen.getByLabelText('In your words'), 'The fee line');
    fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Thanks for telling us.')).toBeOnTheScreen();
    await waitFor(async () => expect(await stored()).toMatchObject({ rating: 5, why: { reasons: ['clear_why'], note: 'The fee line' } }));
  });

  it('a 2 asks what was off; Skip sends the rating alone', async () => {
    renderRouter(routes, { initialUrl: '/matches' });
    fireEvent.press(await screen.findByLabelText('2 out of 5, A little'));
    expect(await screen.findByText('What was off?')).toBeOnTheScreen();
    expect(screen.getByText('Too far away')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Skip'));
    expect(await screen.findByText('Thanks for telling us.')).toBeOnTheScreen();
    const f = await stored();
    expect(f.rating).toBe(2);
    expect(f.why).toBeUndefined();
  });

  it('a 3 or 4 needs no follow-up', async () => {
    renderRouter(routes, { initialUrl: '/matches' });
    fireEvent.press(await screen.findByLabelText('3 out of 5, Somewhat'));
    expect(await screen.findByText('Thanks for telling us.')).toBeOnTheScreen();
    expect(screen.queryByText('What was off?')).toBeNull();
  });
});
