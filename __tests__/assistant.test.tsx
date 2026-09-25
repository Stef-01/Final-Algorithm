import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { demoResults } from '@/features/match/sessionCore';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout').default,
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': require('@/app/(tabs)/(find)/index').default,
  '(tabs)/(find)/describe': require('@/app/(tabs)/(find)/describe').default,
  '(tabs)/(find)/clarify': require('@/app/(tabs)/(find)/clarify').default,
  '(tabs)/(find)/confirm': require('@/app/(tabs)/(find)/confirm').default,
  '(tabs)/(find)/matching': require('@/app/(tabs)/(find)/matching').default,
  '(tabs)/(find)/matches': require('@/app/(tabs)/(find)/matches').default,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
  refine: require('@/app/refine').default,
};

beforeEach(() => AsyncStorage.clear());

describe('floating assistant', () => {
  it('is always there, and refines the matches in conversation', async () => {
    await AsyncStorage.setItem('watl_session', JSON.stringify(demoResults('psych-masking')));
    renderRouter(routes, { initialUrl: '/matches' });
    fireEvent.press(await screen.findByLabelText('Refine your matches with the assistant'));
    expect(await screen.findByText(/who fit\. Tell me what to change/)).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Online only'));
    expect(await screen.findByText(/^Done — now online sessions only\./, {}, { timeout: 3000 })).toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText('Message the assistant'), 'hmm not sure');
    fireEvent.press(screen.getByLabelText('Send'));
    expect(await screen.findByText(/couldn't pick out a change/, {}, { timeout: 3000 })).toBeOnTheScreen();

    fireEvent.press(screen.getByText('See matches'));
    await waitFor(() => expect(screen.queryByLabelText('Message the assistant')).toBeNull());
  });

  it('starts a search from the first screen too', async () => {
    renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Ask the assistant'));
    expect(await screen.findByText(/Tell me what you're looking for/)).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Message the assistant'), 'I have ADHD and I want a psychologist with practical strategies');
    fireEvent.press(screen.getByLabelText('Send'));
    await waitFor(() => expect(screen.queryByLabelText('Message the assistant')).toBeNull(), { timeout: 3000 });
  });
});
