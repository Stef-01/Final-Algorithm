import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { setAnalyticsSender } from '@/lib/analytics';

// A crashing screen shows a way out, not a blank app, and "Start over" clears the saved search.

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const Boom = () => {
  throw new TypeError("Cannot read properties of undefined (reading 'matches') — with patient text");
};

describe('when a screen crashes', () => {
  const sent: { name: string; props: object }[] = [];
  beforeAll(() => setAnalyticsSender((name, props) => sent.push({ name, props })));
  afterAll(() => setAnalyticsSender(null));
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('offers Start over, which clears the saved search but keeps saved clinicians', async () => {
    await AsyncStorage.setItem('watl_session', '{"broken":true}');
    await AsyncStorage.setItem('watl_saved', '[{"clinicianId":"alice-bui","fit":"Good fit","savedAt":"2026-09-25"}]');
    renderRouter(
      {
        _layout: require('@/app/_layout'),
        '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
        '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
        '(tabs)/(find)/index': Boom,
        '(tabs)/saved': () => null,
        '(tabs)/settings': () => null,
      },
      { initialUrl: '/' },
    );
    expect(await screen.findByText('Something went wrong.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Start over'));
    await waitFor(async () => expect(await AsyncStorage.getItem('watl_session')).toBeNull());
    expect(await AsyncStorage.getItem('watl_saved')).toContain('alice-bui');
    // Only the error's type is reported, never its message.
    expect(sent.find((e) => e.name === 'app_error')?.props).toEqual({ kind: 'TypeError' });
  });
});
