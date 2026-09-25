import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { demoResults } from '@/features/match/sessionCore';

// PRD §45 / docs/privacy.md: what the patient told WATL stays on the device for at most 24 hours.

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout').default,
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': () => null,
  '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
};

const HOUR = 60 * 60 * 1000;
beforeEach(() => AsyncStorage.clear());

describe('session storage', () => {
  it('comes back within 24 hours', async () => {
    await AsyncStorage.setItem('watl_session', JSON.stringify({ ...demoResults('psych-trauma-online'), updatedAt: Date.now() - 23 * HOUR }));
    renderRouter(routes, { initialUrl: '/matches' });
    expect((await screen.findAllByText('Alice Bui')).length).toBeGreaterThan(0);
  });

  it('is discarded, and deleted, after 24 hours', async () => {
    await AsyncStorage.setItem('watl_session', JSON.stringify({ ...demoResults('psych-trauma-online'), updatedAt: Date.now() - 25 * HOUR }));
    renderRouter(routes, { initialUrl: '/matches' });
    expect(await screen.findByText("Tell me what you're looking for first.")).toBeOnTheScreen();
    expect(screen.queryByText('Alice Bui')).toBeNull();
    await waitFor(async () => expect(await AsyncStorage.getItem('watl_session')).toBeNull());
  });
});
