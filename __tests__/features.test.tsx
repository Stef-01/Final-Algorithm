import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Share } from 'react-native';

import { withRecent } from '@/features/match/recent';
import { demoResults } from '@/features/match/sessionCore';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': require('@/app/(tabs)/(find)/index').default,
  '(tabs)/(find)/all': require('@/app/(tabs)/(find)/all').default,
  '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
  'clinician/[id]': require('@/app/clinician/[id]').default,
  compare: require('@/app/compare').default,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('watl_session', JSON.stringify({ ...demoResults('psych-trauma-online'), updatedAt: Date.now() }));
});

describe('compare', () => {
  it('pick two or three on See all, then see them side by side', async () => {
    renderRouter(routes, { initialUrl: '/all' });
    fireEvent.press(await screen.findByText('Compare'));
    fireEvent.press(screen.getByLabelText(/^1\. Alice Bui/));
    expect(screen.queryByText(/^Compare \d$/)).toBeNull(); // needs two
    fireEvent.press(screen.getByLabelText(/^2\. Paula Garrido/));
    fireEvent.press(await screen.findByText('Compare 2'));
    await waitFor(() => expect(screen).toHavePathname('/compare'));
    for (const label of ['Why they fit', 'Approach']) expect(screen.getByText(label)).toBeOnTheScreen();
    // Rows where both say the same thing are left out.
    expect(screen.queryByText('Next available')).toBeNull();
    expect(screen.getByText('Alice Bui')).toBeOnTheScreen();
    expect(screen.getByText('Paula Garrido')).toBeOnTheScreen();
  });
});

describe('pick up where you left off', () => {
  it('keeps the latest six, newest first, once each', () => {
    expect(withRecent(['a', 'b', 'c', 'd', 'e', 'f'], 'c')).toEqual(['c', 'a', 'b', 'd', 'e', 'f']);
    expect(withRecent(['a', 'b', 'c', 'd', 'e', 'f'], 'g')).toHaveLength(6);
  });

  it('Home offers your matches and the people you last opened', async () => {
    await AsyncStorage.setItem('watl_recent', JSON.stringify(['paula-garrido']));
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText(/^Your matches · \d+$/)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Paula Garrido, recently viewed'));
    await waitFor(() => expect(screen).toHavePathname('/clinician/paula-garrido'));
  });

  it('shows nothing before there is anything to come back to', async () => {
    await AsyncStorage.clear();
    renderRouter(routes, { initialUrl: '/' });
    await screen.findByText('Find someone');
    expect(screen.queryByText(/Your matches/)).toBeNull();
  });
});

describe('share a profile', () => {
  it('opens the share sheet with a link to the profile', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    renderRouter(routes, { initialUrl: '/clinician/paula-garrido' });
    fireEvent.press(await screen.findByLabelText("Share Paula Garrido's profile"));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://final-algorithm.vercel.app/clinician/paula-garrido' })));
  });
});
